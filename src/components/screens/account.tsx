"use client";

import { useEffect, useRef, useState } from "react";
import { parseBackup, serializeBackup } from "@/lib/backup";
import { toDateKey } from "@/lib/calc";
import { confirmDanger, useDialog } from "@/lib/dialog";
import { useNav } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { AuthFlow } from "./auth";
import { Banner, Button, Card, Group, Icon, NavBar, Page, Row } from "../kit";

const ago = (ms: number | null, now: number): string => {
  if (!ms) return "ainda não sincronizou";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 10) return "agora mesmo";
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  return `há ${Math.round(m / 60)} h`;
};

export function useSignedIn() {
  return useSync((s) => s.status !== "signed-out" && s.status !== "unconfigured");
}

/** Apaga tudo deste aparelho (e da nuvem, se conectado), com confirmação. */
export async function wipeEverything(): Promise<boolean> {
  const signedIn = useSync.getState().status !== "signed-out" && useSync.getState().status !== "unconfigured";
  const ok = await confirmDanger(
    "Apagar todos os dados?",
    `Perfil, dieta, alimentos e registros serão removidos ${signedIn ? "deste aparelho e da nuvem" : "deste aparelho"}. Não dá para desfazer.`,
    "Apagar tudo",
  );
  if (!ok) return false;
  const sync = useSync.getState();
  if (signedIn && !(await sync.wipeCloud())) return false;
  sync.silently(() => useStore.getState().resetAll());
  useNav.getState().reset();
  return true;
}

export function exportBackup() {
  const { user, foods, plan, logs, shopping } = useStore.getState();
  const blob = new Blob([serializeBackup({ user, foods, plan, logs, shopping })], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fuel-backup-${toDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Abre o seletor de arquivo e importa um backup .json. Devolve o gatilho e o <input> escondido. */
export function useBackupImport(opts: { confirmReplace?: boolean; onDone?: () => void } = {}) {
  const importData = useStore((s) => s.importData);
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const res = parseBackup(await file.text());
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    if (opts.confirmReplace) {
      const ok = await useDialog.getState().ask({
        title: "Restaurar este backup?",
        message: "Isso substitui TODOS os dados deste aparelho (perfil, dieta e registros).",
        actions: [{ label: "Restaurar", value: "ok", strong: true }, { label: "Cancelar", value: "cancel" }],
      });
      if (ok !== "ok") return;
    }
    importData(res.data);
    setMsg({ ok: true, text: "Backup restaurado." });
    opts.onDone?.();
  };
  const input = (
    <input ref={ref} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
  );
  return { open: () => ref.current?.click(), input, msg };
}

// ───────────── Conta e sincronização ─────────────

export function AccountScreen() {
  const pop = useNav((s) => s.pop);
  const { status, email, lastSyncAt, error } = useSync();
  const signOut = useSync((s) => s.signOut);
  const syncNow = useSync((s) => s.syncNow);
  const resolveConflict = useSync((s) => s.resolveConflict);
  const resetPassword = useSync((s) => s.resetPassword);
  const [auth, setAuth] = useState<"signin" | "signup" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (auth && status === "signed-out") return <AuthFlow initial={auth} onClose={() => setAuth(null)} />;

  const label = status === "syncing" ? "Sincronizando…" : status === "error" ? "Erro ao sincronizar" : "Tudo sincronizado";
  const sub = status === "error" ? (error ?? "Tente de novo em instantes.") : status === "syncing" ? "Enviando e buscando mudanças" : `Última vez ${ago(lastSyncAt, now)}`;

  return (
    <Page tabbar={false}>
      <NavBar back="Perfil" onBack={pop} />
      <h1 className="t-t28">Conta e sincronização</h1>

      {status === "unconfigured" && (
        <Card className="grid gap-2">
          <h2 className="t-body-sb">Sincronização desligada</h2>
          <p className="t-small text-tx2">A sincronização entre aparelhos não está ligada neste app (faltam as chaves do Supabase). Tudo funciona normalmente e fica salvo só neste aparelho. Use um backup para guardar uma cópia.</p>
        </Card>
      )}

      {status === "signed-out" && (
        <Card className="grid gap-3">
          <div>
            <h2 className="t-t21">Entrar para sincronizar</h2>
            <p className="t-small mt-1 text-tx2">Com uma conta, seus dados ficam guardados na nuvem e aparecem no celular e no computador. Só você acessa: cada conta vê apenas os próprios dados.</p>
          </div>
          <Button onClick={() => setAuth("signin")}>Entrar</Button>
          <Button variant="outline" onClick={() => setAuth("signup")}>Criar conta</Button>
        </Card>
      )}

      {status === "conflict" && (
        <Card className="grid gap-3">
          <div>
            <h2 className="t-t21">Já existem dados nesta conta</h2>
            <p className="t-small mt-1 text-tx2">A conta <span className="text-tx">{email}</span> já tem dados na nuvem, e este aparelho também tem os dele. Qual manter?</p>
          </div>
          <Button onClick={() => void resolveConflict("cloud")}>Usar os dados da nuvem</Button>
          <Button variant="outline" onClick={() => void resolveConflict("device")}>Manter os deste aparelho</Button>
          <p className="t-cap text-tx2">“Nuvem” troca o que há aqui pelo que está na conta. “Deste aparelho” envia estes dados e eles prevalecem nos dias e na dieta em comum.</p>
        </Card>
      )}

      {(status === "idle" || status === "syncing" || status === "error") && (
        <>
          <Card className="grid gap-2.5 p-[18px]">
            <div className="flex items-center gap-2.5">
              <span className={`grid size-7 place-items-center rounded-full text-white ${status === "error" ? "bg-err" : status === "syncing" ? "bg-warn" : "bg-ok"}`}>
                <Icon name={status === "error" ? "alert" : status === "syncing" ? "refresh" : "check"} size={16} sw={3} />
              </span>
              <div>
                <p className="t-body-sb">{label}</p>
                <p className="t-small text-tx2">{sub}</p>
              </div>
            </div>
            <p className="t-small text-tx2">O app funciona sem internet. As marcações ficam salvas no aparelho e sobem quando houver conexão.</p>
          </Card>
          <Group>
            <Row title="E-mail" value={email ?? ""} chevron={false} />
            <Row title="Alterar senha" onClick={async () => { if (!email) return; const r = await resetPassword(email); setNote(r.message); }} />
          </Group>
          {note && <Banner tone="ok" icon="check">{note}</Banner>}
          <Button variant="outline" size="md" disabled={status === "syncing"} onClick={syncNow}>Sincronizar agora</Button>
          <div className="grid gap-0.5 pt-2">
            <Button variant="link" size="md" onClick={() => void signOut(false)}>Sair da conta</Button>
            <Button
              variant="link"
              size="md"
              danger
              onClick={async () => {
                if (await confirmDanger("Sair e limpar este aparelho?", "Os dados deste aparelho serão apagados. Eles continuam na sua conta, na nuvem.", "Sair e limpar")) void signOut(true);
              }}
            >
              Sair e limpar este aparelho
            </Button>
          </div>
          <p className="t-cap px-1 text-center text-tx2">Em aparelho compartilhado, use “Sair e limpar” para não deixar seus dados de saúde lá.</p>
        </>
      )}
    </Page>
  );
}

// ───────────── Dados e backup ─────────────

export function DataScreen() {
  const pop = useNav((s) => s.pop);
  const { open, input, msg } = useBackupImport({ confirmReplace: true });
  return (
    <Page tabbar={false}>
      <NavBar back="Perfil" onBack={pop} />
      <div>
        <h1 className="t-t28">Dados e backup</h1>
        <p className="t-body text-tx2">Um arquivo .json com perfil, dieta, alimentos e registros.</p>
      </div>
      <Group>
        <Row icon="ul" title="Exportar backup" value=".json" onClick={exportBackup} />
        <Row icon="dl" title="Restaurar backup" onClick={open} />
        <Row icon="file" title="Importar PDF da dieta" value="Em breve" chevron={false} disabled />
      </Group>
      {input}
      {msg && <Banner tone={msg.ok ? "ok" : "err"} icon={msg.ok ? "check" : "alert"}>{msg.text}</Banner>}
      <p className="t-cap px-1 text-tx2">Exporte de vez em quando se você usa o app sem conta. Com conta, a nuvem já guarda uma cópia.</p>
      <div className="pt-4">
        <Button variant="link" danger onClick={() => void wipeEverything()}>Apagar todos os dados</Button>
      </div>
    </Page>
  );
}
