"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { Banner, Button, Icon, TextField } from "../kit";

export type AuthView = "welcome" | "signin" | "signup" | "forgot" | "sent" | "confirm" | "newpass";

const validMail = (s: string) => /\S+@\S+\.\S+/.test(s.trim());

function Shell({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <div className="ctx-white min-h-dvh bg-bg">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between gap-8 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="grid content-start gap-6">{top}</div>
        <div className="grid gap-2">{bottom}</div>
      </main>
    </div>
  );
}

const Back = ({ onClick, label = "Voltar" }: { onClick: () => void; label?: string }) => (
  <button onClick={onClick} className="t-body -ml-1 flex h-11 items-center gap-0.5 self-start text-link active:opacity-60">
    <Icon name="cl" size={24} sw={2} />
    {label}
  </button>
);

const Head = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="grid gap-2">
    <h1 className="t-t40">{title}</h1>
    {sub && <p className="t-body text-tx2">{sub}</p>}
  </div>
);

function AppMark({ size = 72 }: { size?: number }) {
  return (
    <span className="grid place-items-center bg-blue text-white" style={{ width: size, height: size, borderRadius: size * 0.25 }}>
      <Icon name="flame" size={size * 0.5} sw={2} />
    </span>
  );
}

function Feature({ icon, title, desc }: { icon: "check" | "bag" | "trend"; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue/10 text-blue">
        <Icon name={icon} size={24} />
      </span>
      <div>
        <p className="t-body-sb">{title}</p>
        <p className="t-small text-tx2">{desc}</p>
      </div>
    </div>
  );
}

/**
 * Fluxo de acesso: boas-vindas, entrar, criar conta, recuperar senha,
 * confirmar e-mail e definir nova senha. Vale tanto na primeira abertura
 * quanto quando aberto por Perfil › Conta (`onClose`).
 */
export function AuthFlow({ initial = "welcome", onClose }: { initial?: AuthView; onClose?: () => void }) {
  const status = useSync((s) => s.status);
  const signIn = useSync((s) => s.signIn);
  const signUp = useSync((s) => s.signUp);
  const resetPassword = useSync((s) => s.resetPassword);
  const resendConfirmation = useSync((s) => s.resendConfirmation);
  const updatePassword = useSync((s) => s.updatePassword);
  const setPrefs = usePrefs((s) => s.set);
  const updateUser = useStore((s) => s.updateUser);

  const [view, setView] = useState<AuthView>(initial);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // conectou: quem abriu pela tela de Conta volta para ela
  useEffect(() => {
    if (onClose && status !== "signed-out" && status !== "unconfigured") onClose();
  }, [status, onClose]);

  const go = (v: AuthView) => {
    setErr(null);
    setInfo(null);
    setView(v);
  };
  const guest = () => {
    setPrefs({ guest: true });
    onClose?.();
  };
  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    setInfo(null);
    await fn();
    setBusy(false);
  };

  if (view === "welcome")
    return (
      <Shell
        top={
          <>
            <div className="pt-6"><AppMark /></div>
            <h1 className="t-t40">Coma bem.<br />Veja o resultado.</h1>
            <p className="t-body -mt-3 text-tx2">Dieta, água, compras e peso num só lugar, com as contas feitas por você.</p>
            <div className="grid gap-[18px] pt-3">
              <Feature icon="check" title="Refeições e macros" desc="Marque o que comeu e veja o saldo do dia." />
              <Feature icon="bag" title="Compras da semana" desc="A lista sai direto da sua dieta." />
              <Feature icon="trend" title="Peso e déficit" desc="O app calibra o seu gasto real com o peso." />
            </div>
          </>
        }
        bottom={
          <>
            <Button onClick={() => go("signup")}>Criar conta</Button>
            <Button variant="link" onClick={() => go("signin")}>Já tenho conta</Button>
            <Button variant="link" size="md" onClick={guest}>Usar sem conta neste aparelho</Button>
            <p className="t-cap text-center text-tx2">Seus dados ficam no aparelho e só sincronizam se você entrar.</p>
          </>
        }
      />
    );

  if (view === "signin") {
    const wrong = err?.includes("incorretos");
    return (
      <Shell
        top={
          <>
            <Back onClick={() => (initial === "signin" && onClose ? onClose() : go("welcome"))} />
            <Head title="Entrar" sub="Use o e-mail da sua conta para sincronizar entre aparelhos." />
            {err && <Banner tone="err" icon="info">{err}</Banner>}
            <div className="grid gap-4">
              <TextField label="E-mail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" />
              <TextField label="Senha" password autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} error={wrong ? "A senha não confere com este e-mail." : undefined} />
              <button onClick={() => go("forgot")} className="t-small justify-self-end text-link">Esqueci a senha</button>
            </div>
          </>
        }
        bottom={
          <>
            <Button disabled={busy || !validMail(email) || pass.length < 6} onClick={() => wrap(async () => { const r = await signIn(email, pass); if (!r.ok) setErr(r.message); })}>
              {busy ? "Entrando…" : "Entrar"}
            </Button>
            <Button variant="outline" onClick={guest}>Usar sem conta neste aparelho</Button>
            <p className="t-small pt-2 text-center text-tx2">
              Não tem conta? <button onClick={() => go("signup")} className="t-small-sb text-link">Criar conta</button>
            </p>
          </>
        }
      />
    );
  }

  if (view === "signup")
    return (
      <Shell
        top={
          <>
            <Back onClick={() => (initial === "signup" && onClose ? onClose() : go("welcome"))} />
            <Head title="Criar conta" sub="Leva menos de um minuto. Você monta a dieta depois." />
            {err && <Banner tone="err" icon="info">{err}</Banner>}
            <div className="grid gap-4">
              <TextField label="Nome" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado" />
              <TextField label="E-mail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" />
              <TextField label="Senha" password autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Mínimo de 6 caracteres" hint="Use letras e números." />
            </div>
          </>
        }
        bottom={
          <>
            <Button
              disabled={busy || !validMail(email) || pass.length < 6}
              onClick={() =>
                wrap(async () => {
                  const r = await signUp(email, pass);
                  if (!r.ok) return setErr(r.message);
                  if (name.trim()) updateUser({ name: name.trim() });
                  if (r.needsConfirm) go("confirm");
                })
              }
            >
              {busy ? "Criando…" : "Criar conta"}
            </Button>
            <p className="t-cap pt-1 text-center text-tx2">Ao criar a conta você concorda com os Termos de uso e a Política de privacidade.</p>
          </>
        }
      />
    );

  if (view === "forgot")
    return (
      <Shell
        top={
          <>
            <Back onClick={() => go("signin")} />
            <Head title="Esqueceu a senha?" sub="Digite seu e-mail e enviamos um link para criar uma nova." />
            {err && <Banner tone="err" icon="info">{err}</Banner>}
            <TextField label="E-mail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" />
          </>
        }
        bottom={
          <>
            <Button disabled={busy || !validMail(email)} onClick={() => wrap(async () => { const r = await resetPassword(email); if (r.ok) go("sent"); else setErr(r.message); })}>
              {busy ? "Enviando…" : "Enviar link"}
            </Button>
            <Button variant="link" onClick={() => go("signin")}>Voltar para entrar</Button>
          </>
        }
      />
    );

  if (view === "sent" || view === "confirm") {
    const confirm = view === "confirm";
    return (
      <Shell
        top={
          <div className="grid justify-items-center gap-6 pt-24 text-center">
            <span className="grid size-24 place-items-center rounded-full bg-blue/10 text-blue"><Icon name="mail" size={44} sw={1.6} /></span>
            <div className="grid gap-2">
              <h1 className="t-t28">Confira seu e-mail</h1>
              <p className="t-body text-tx2">
                {confirm ? "Enviamos um link de confirmação para " : "Se existir uma conta para "}
                <span className="text-tx">{email}</span>
                {confirm ? ". Abra o e-mail e toque no link para ativar a conta." : ", o link para criar uma nova senha já está a caminho."}
              </p>
            </div>
            {info && <Banner tone="ok" icon="check">{info}</Banner>}
            {err && <Banner tone="err" icon="info">{err}</Banner>}
          </div>
        }
        bottom={
          <>
            <a href="mailto:" className="t-body inline-flex h-12 w-full items-center justify-center rounded-full bg-blue text-white active:opacity-60">Abrir app de e-mail</a>
            {confirm && <Button variant="link" disabled={busy} onClick={() => wrap(async () => { const r = await resendConfirmation(email); if (r.ok) setInfo(r.message); else setErr(r.message); })}>Reenviar e-mail</Button>}
            <Button variant="link" onClick={() => go("signin")}>Já confirmei · Entrar</Button>
          </>
        }
      />
    );
  }

  // newpass
  const mismatch = pass2.length > 0 && pass !== pass2;
  return (
    <Shell
      top={
        <>
          <div className="pt-6"><AppMark size={56} /></div>
          <Head title="Nova senha" sub="Escolha uma senha nova para a sua conta." />
          {err && <Banner tone="err" icon="info">{err}</Banner>}
          <div className="grid gap-4">
            <TextField label="Nova senha" password autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Mínimo de 6 caracteres" />
            <TextField label="Repita a senha" password autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} error={mismatch ? "As senhas não são iguais." : undefined} />
          </div>
        </>
      }
      bottom={
        <Button disabled={busy || pass.length < 6 || pass !== pass2} onClick={() => wrap(async () => { const r = await updatePassword(pass); if (!r.ok) setErr(r.message); else onClose?.(); })}>
          {busy ? "Salvando…" : "Salvar nova senha"}
        </Button>
      }
    />
  );
}
