"use client";

import { create } from "zustand";
import { supabase, syncConfigured } from "./supabase";
import { useStore } from "./store";
import type { DailyLog } from "./types";

/**
 * Sincronização offline-first.
 *  - O aparelho é a fonte da verdade do dia a dia (localStorage via Zustand).
 *  - Cada pedaço (config + um log por dia) tem um horário de edição (`modified_ms`).
 *  - Pull: aplica o que a nuvem tem de mais novo. Push: envia o que mudou aqui.
 *  - Conflito no mesmo pedaço: vence a edição mais recente (último a editar).
 */

const META_KEY = "fuel-sync-v1";
const CONFIG = "config";
const logKey = (d: string) => `log:${d}`;
const SKEW_MS = 10 * 60 * 1000; // folga para relógios diferentes entre aparelhos

interface Meta {
  userId: string | null;
  /** última edição local de cada pedaço */
  mod: Record<string, number>;
  /** versão (ms) que já está igual na nuvem */
  synced: Record<string, number>;
  lastPullMs: number;
}

const emptyMeta = (): Meta => ({ userId: null, mod: {}, synced: {}, lastPullMs: 0 });

function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? { ...emptyMeta(), ...JSON.parse(raw) } : emptyMeta();
  } catch {
    return emptyMeta();
  }
}
function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* sem armazenamento: segue sem persistir os metadados */
  }
}

let meta: Meta = emptyMeta();
let userId: string | null = null;
let applying = false; // true enquanto aplicamos dados vindos da nuvem (não conta como edição local)
let running = false;
let queued = false;
let inited = false;
let timer: ReturnType<typeof setTimeout> | undefined;

export type SyncStatus = "unconfigured" | "signed-out" | "syncing" | "idle" | "error" | "conflict";

interface SyncState {
  status: SyncStatus;
  email: string | null;
  lastSyncAt: number | null;
  error: string | null;
  init: () => void;
  /** true quando o usuário abriu o link de "esqueci a senha" e precisa definir uma nova. */
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; message: string; needsConfirm?: boolean }>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  updatePassword: (password: string) => Promise<{ ok: boolean; message: string }>;
  resendConfirmation: (email: string) => Promise<{ ok: boolean; message: string }>;
  signOut: (wipeLocal?: boolean) => Promise<void>;
  syncNow: () => void;
  resolveConflict: (choice: "cloud" | "device") => Promise<void>;
  wipeCloud: () => Promise<boolean>;
  /** Roda uma alteração local sem contá-la como edição a sincronizar. */
  silently: (fn: () => void) => void;
}

const friendly = (e: unknown): string => {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail (veja a caixa de entrada) antes de entrar.";
  if (/already registered|already been registered/i.test(m)) return "Este e-mail já tem conta. Use “Entrar”.";
  if (/Password should be at least/i.test(m)) return "A senha precisa ter ao menos 6 caracteres.";
  if (/rate limit/i.test(m)) return "Muitas tentativas. Espere alguns minutos.";
  if (/fetch|network|Failed to/i.test(m)) return "Sem conexão com a nuvem. Tentamos de novo quando voltar.";
  return m;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function configPayload() {
  const s = useStore.getState();
  return { user: s.user, foods: s.foods, plan: s.plan, shopping: s.shopping };
}

function silently(fn: () => void) {
  applying = true;
  try {
    fn();
  } finally {
    applying = false;
  }
}

function applyConfig(data: unknown) {
  if (!isObj(data) || !isObj(data.user) || !Array.isArray(data.foods) || !isObj(data.plan) || !Array.isArray((data.plan as { meals?: unknown }).meals))
    return;
  silently(() =>
    useStore.setState({
      user: { ...(data.user as object), onboarded: true } as never,
      foods: data.foods as never,
      plan: data.plan as never,
      shopping: (isObj(data.shopping) ? data.shopping : {}) as never,
    }),
  );
}

function applyLog(date: string, data: unknown) {
  if (!isObj(data) || typeof data.date !== "string") return;
  silently(() => useStore.setState((s) => ({ logs: { ...s.logs, [date]: data as unknown as DailyLog } })));
}

function markAllDirty() {
  const now = Date.now();
  meta.mod[CONFIG] = now;
  for (const d of Object.keys(useStore.getState().logs)) meta.mod[logKey(d)] = now;
  saveMeta();
}

/** Traz da nuvem o que é mais novo que o local. `all` ignora o que já foi visto. */
async function pull(all = false) {
  const sb = supabase()!;
  const cfg = await sb.from("app_config").select("data, modified_ms").maybeSingle();
  if (cfg.error) throw cfg.error;
  if (cfg.data) {
    const ms = Number(cfg.data.modified_ms);
    if (all || ms > (meta.mod[CONFIG] ?? 0)) {
      applyConfig(cfg.data.data);
      meta.mod[CONFIG] = ms;
      meta.synced[CONFIG] = ms;
    }
  }

  const since = all ? 0 : Math.max(0, meta.lastPullMs - SKEW_MS);
  const logs = await sb.from("daily_logs").select("date, data, modified_ms").gt("modified_ms", since);
  if (logs.error) throw logs.error;
  let maxMs = meta.lastPullMs;
  for (const row of logs.data ?? []) {
    const ms = Number(row.modified_ms);
    const k = logKey(row.date as string);
    maxMs = Math.max(maxMs, ms);
    if (all || ms > (meta.mod[k] ?? 0)) {
      applyLog(row.date as string, row.data);
      meta.mod[k] = ms;
      meta.synced[k] = ms;
    }
  }
  meta.lastPullMs = maxMs;
  saveMeta();
}

/** Envia o que mudou aqui desde a última sincronização. */
async function push() {
  const sb = supabase()!;
  const dirty = Object.keys(meta.mod).filter((k) => meta.mod[k] > (meta.synced[k] ?? 0));
  if (!dirty.length) return;

  if (dirty.includes(CONFIG)) {
    const mod = meta.mod[CONFIG];
    const { error } = await sb
      .from("app_config")
      .upsert({ user_id: userId, data: configPayload(), modified_ms: mod }, { onConflict: "user_id" });
    if (error) throw error;
    meta.synced[CONFIG] = mod;
  }

  const logs = useStore.getState().logs;
  const rows: { user_id: string | null; date: string; data: DailyLog; modified_ms: number }[] = [];
  for (const k of dirty.filter((x) => x.startsWith("log:"))) {
    const date = k.slice(4);
    if (logs[date]) rows.push({ user_id: userId, date, data: logs[date], modified_ms: meta.mod[k] });
    else meta.synced[k] = meta.mod[k]; // dia que não existe mais aqui: nada a enviar
  }
  if (rows.length) {
    const { error } = await sb.from("daily_logs").upsert(rows, { onConflict: "user_id,date" });
    if (error) throw error;
    for (const r of rows) meta.synced[logKey(r.date)] = r.modified_ms;
  }
  saveMeta();
}

export const useSync = create<SyncState>()((set, get) => {
  async function runSync() {
    if (!userId || get().status === "conflict") return;
    if (running) {
      queued = true;
      return;
    }
    running = true;
    set({ status: "syncing", error: null });
    try {
      await pull();
      await push();
      set({ status: "idle", lastSyncAt: Date.now() });
    } catch (e) {
      set({ status: "error", error: friendly(e) });
    } finally {
      running = false;
      if (queued) {
        queued = false;
        schedule(300);
      }
    }
  }

  function schedule(ms: number) {
    clearTimeout(timer);
    timer = setTimeout(() => void runSync(), ms);
  }

  function onLocalChange(s: ReturnType<typeof useStore.getState>, prev: ReturnType<typeof useStore.getState>) {
    if (applying || !userId || meta.userId !== userId) return;
    const now = Date.now();
    let changed = false;
    if (s.user !== prev.user || s.foods !== prev.foods || s.plan !== prev.plan || s.shopping !== prev.shopping) {
      meta.mod[CONFIG] = now;
      changed = true;
    }
    if (s.logs !== prev.logs)
      for (const d of Object.keys(s.logs))
        if (s.logs[d] !== prev.logs[d]) {
          meta.mod[logKey(d)] = now;
          changed = true;
        }
    if (changed) {
      saveMeta();
      schedule(1500);
    }
  }

  /** Primeiro login desta conta neste aparelho: decide de onde vêm os dados. */
  async function onSignedIn(id: string, email: string | undefined) {
    userId = id;
    set({ email: email ?? null, status: "syncing", error: null });
    meta = loadMeta();
    if (meta.userId === id) return runSync();

    try {
      const sb = supabase()!;
      const cfg = await sb.from("app_config").select("modified_ms").maybeSingle();
      if (cfg.error) throw cfg.error;
      const st = useStore.getState();
      const localHas = Boolean(st.user.onboarded) || Object.keys(st.logs).length > 0;
      meta = { ...emptyMeta(), userId: id };

      if (!cfg.data) {
        if (localHas) markAllDirty();
        saveMeta();
        return runSync();
      }
      if (!localHas) {
        await pull(true);
        saveMeta();
        return runSync();
      }
      meta = { ...emptyMeta(), userId: null }; // só confirma o vínculo depois da escolha
      set({ status: "conflict" });
    } catch (e) {
      set({ status: "error", error: friendly(e) });
    }
  }

  return {
    status: syncConfigured ? "signed-out" : "unconfigured",
    email: null,
    lastSyncAt: null,
    error: null,
    recovering: false,

    init: () => {
      if (!syncConfigured || inited || typeof window === "undefined") return;
      inited = true;
      const sb = supabase()!;
      // O callback não pode chamar o Supabase direto (risco de deadlock): adia um tick.
      sb.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
          if (event === "PASSWORD_RECOVERY") set({ recovering: true });
          if (session?.user) {
            if (userId !== session.user.id) void onSignedIn(session.user.id, session.user.email);
          } else {
            userId = null;
            set({ status: "signed-out", email: null });
          }
        }, 0);
      });
      useStore.subscribe(onLocalChange);
      const tick = () => document.visibilityState === "visible" && userId && schedule(200);
      document.addEventListener("visibilitychange", tick);
      window.addEventListener("online", tick);
      setInterval(tick, 90_000);
    },

    signIn: async (email, password) => {
      const sb = supabase();
      if (!sb) return { ok: false, message: "Sincronização não configurada." };
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { ok: false, message: friendly(error) } : { ok: true, message: "Conectado." };
    },

    signUp: async (email, password) => {
      const sb = supabase();
      if (!sb) return { ok: false, message: "Sincronização não configurada." };
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
      if (error) return { ok: false, message: friendly(error) };
      if (!data.session)
        return {
          ok: true,
          needsConfirm: true,
          message: "Enviamos um e-mail de confirmação. Confirme e depois toque em “Entrar”.",
        };
      return { ok: true, message: "Conta criada e conectada." };
    },

    resetPassword: async (email) => {
      const sb = supabase();
      if (!sb) return { ok: false, message: "Sincronização não configurada." };
      const redirectTo = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`;
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      return error
        ? { ok: false, message: friendly(error) }
        : { ok: true, message: "Se este e-mail tiver conta, enviamos o link para criar uma nova senha." };
    },

    updatePassword: async (password) => {
      const sb = supabase();
      if (!sb) return { ok: false, message: "Sincronização não configurada." };
      const { error } = await sb.auth.updateUser({ password });
      if (error) return { ok: false, message: friendly(error) };
      set({ recovering: false });
      return { ok: true, message: "Senha alterada." };
    },

    resendConfirmation: async (email) => {
      const sb = supabase();
      if (!sb) return { ok: false, message: "Sincronização não configurada." };
      const { error } = await sb.auth.resend({ type: "signup", email: email.trim() });
      return error
        ? { ok: false, message: friendly(error) }
        : { ok: true, message: "E-mail reenviado. Olhe também a caixa de spam." };
    },

    signOut: async (wipeLocal = false) => {
      const sb = supabase();
      if (!sb) return;
      await sb.auth.signOut();
      userId = null;
      meta = emptyMeta();
      saveMeta();
      if (wipeLocal) silently(() => useStore.getState().resetAll());
      set({ status: "signed-out", email: null });
    },

    syncNow: () => schedule(0),

    resolveConflict: async (choice) => {
      if (!userId) return;
      const id = userId;
      meta = { ...emptyMeta(), userId: id };
      set({ status: "syncing", error: null });
      try {
        if (choice === "cloud") {
          silently(() => useStore.setState({ logs: {}, shopping: {} }));
          await pull(true);
        } else {
          markAllDirty(); // mais novo que a nuvem → vence
        }
        saveMeta();
        set({ status: "idle" });
        await runSync();
      } catch (e) {
        set({ status: "error", error: friendly(e) });
      }
    },

    wipeCloud: async () => {
      const sb = supabase();
      if (!sb || !userId) return true; // nada na nuvem para apagar
      const a = await sb.from("daily_logs").delete().eq("user_id", userId);
      const b = await sb.from("app_config").delete().eq("user_id", userId);
      if (a.error || b.error) {
        set({ status: "error", error: friendly(a.error ?? b.error) });
        return false;
      }
      meta = { ...emptyMeta(), userId };
      saveMeta();
      return true;
    },

    silently,
  };
});
