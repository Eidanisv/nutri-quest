"use client";

import { useEffect, useState } from "react";
import { useSync } from "@/lib/sync";
import { Card, Field, btnGhost, btnPrimary, inputCls } from "./ui";

function ago(ms: number | null, now: number): string {
  if (!ms) return "ainda não sincronizou";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 10) return "agora mesmo";
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  return `há ${Math.round(m / 60)} h`;
}

/** Bolinha no topo: só aparece com conta conectada. */
export function SyncDot() {
  const status = useSync((s) => s.status);
  if (status === "unconfigured" || status === "signed-out") return null;
  const color =
    status === "error" ? "bg-alert" : status === "syncing" || status === "conflict" ? "bg-amber" : "bg-neon";
  const label =
    status === "error" ? "Erro de sincronização" : status === "idle" ? "Sincronizado" : "Sincronizando";
  return <span role="img" aria-label={label} title={label} className={`size-2 rounded-full ${color}`} />;
}

export function AccountCard() {
  const { status, email, lastSyncAt, error } = useSync();
  const signIn = useSync((s) => s.signIn);
  const signUp = useSync((s) => s.signUp);
  const signOut = useSync((s) => s.signOut);
  const syncNow = useSync((s) => s.syncNow);
  const resolveConflict = useSync((s) => s.resolveConflict);

  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (status === "unconfigured") {
    return (
      <Card className="grid gap-2">
        <h3 className="text-sm font-semibold">Conta e sincronização</h3>
        <p className="text-xs leading-relaxed text-dim">
          A sincronização entre aparelhos ainda não está ligada neste app (faltam as chaves do
          Supabase). Enquanto isso, tudo funciona normalmente e fica salvo só neste aparelho.
        </p>
      </Card>
    );
  }

  if (status === "conflict") {
    return (
      <Card className="grid gap-3 border-amber/50">
        <h3 className="text-sm font-semibold">Já existem dados nesta conta</h3>
        <p className="text-xs leading-relaxed text-dim">
          A conta <span className="text-text">{email}</span> já tem dados na nuvem, e este aparelho
          também tem os dele. Qual manter?
        </p>
        <button onClick={() => void resolveConflict("cloud")} className={btnPrimary}>
          Usar os dados da nuvem
        </button>
        <button onClick={() => void resolveConflict("device")} className={btnGhost}>
          Manter os deste aparelho
        </button>
        <p className="text-[11px] leading-relaxed text-dim">
          “Nuvem” troca o que há aqui pelo que está na conta. “Deste aparelho” envia estes dados e
          prevalecem sobre os da conta nos dias e na dieta em comum.
        </p>
      </Card>
    );
  }

  if (status === "signed-out") {
    const submit = async (mode: "in" | "up") => {
      setBusy(true);
      setMsg(null);
      const r = await (mode === "in" ? signIn(mail, pass) : signUp(mail, pass));
      setMsg({ ok: r.ok, text: r.message });
      setBusy(false);
      if (r.ok && mode === "in") setPass("");
    };
    return (
      <Card className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">Entrar para sincronizar</h3>
          <p className="mt-1 text-xs leading-relaxed text-dim">
            Com uma conta, seus dados ficam guardados na nuvem e aparecem no celular e no
            computador. Só você acessa: cada conta vê apenas os próprios dados.
          </p>
        </div>
        <Field label="E-mail">
          <input
            type="email"
            autoComplete="email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder="voce@email.com"
            className={inputCls}
          />
        </Field>
        <Field label="Senha" hint="Mínimo de 6 caracteres.">
          <input
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={busy || !mail || pass.length < 6}
            onClick={() => void submit("in")}
            className={btnPrimary}
          >
            Entrar
          </button>
          <button
            disabled={busy || !mail || pass.length < 6}
            onClick={() => void submit("up")}
            className={btnGhost}
          >
            Criar conta
          </button>
        </div>
        {msg && (
          <p className={`text-xs ${msg.ok ? "text-neon" : "text-alert"}`} role="status">
            {msg.text}
          </p>
        )}
      </Card>
    );
  }

  // conectado
  const label =
    status === "syncing"
      ? "Sincronizando…"
      : status === "error"
        ? "Erro ao sincronizar"
        : `Sincronizado ${ago(lastSyncAt, now)}`;
  return (
    <Card className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">Conta</h3>
        <p className="mt-1 text-xs break-all text-dim">{email}</p>
      </div>
      <p
        className={`rounded-xl bg-raised px-3 py-2 text-xs ${status === "error" ? "text-alert" : "text-text"}`}
        role="status"
      >
        {label}
        {status === "error" && error ? ` — ${error}` : ""}
      </p>
      <button onClick={syncNow} disabled={status === "syncing"} className={btnGhost}>
        Sincronizar agora
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => void signOut(false)} className={btnGhost}>
          Sair
        </button>
        <button
          onClick={() => {
            if (window.confirm("Sair e apagar os dados DESTE aparelho? Eles continuam na sua conta na nuvem."))
              void signOut(true);
          }}
          className={`${btnGhost} text-alert`}
        >
          Sair e limpar
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-dim">
        Em aparelho compartilhado, use “Sair e limpar” para não deixar seus dados de saúde lá.
      </p>
    </Card>
  );
}
