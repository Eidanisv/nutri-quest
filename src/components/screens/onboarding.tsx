"use client";

import { useState, type ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calcBmr, calcGet, fmt } from "@/lib/calc";
import { useNav } from "@/lib/nav";
import { askNotificationPermission, usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";
import { ACTIVITY_FACTORS, type ActivityLevel } from "@/lib/types";
import { Banner, Button, Choice, Icon, NumField, Segmented, TextField, Group, Row } from "../kit";
import { useBackupImport } from "./account";

export const LEVELS: { id: ActivityLevel; title: string; desc: string }[] = [
  { id: "sedentary", title: "Sedentário", desc: "Pouco ou nenhum exercício" },
  { id: "light", title: "Leve", desc: "Treino leve 1–3×/semana" },
  { id: "moderate", title: "Moderado", desc: "Treino 3–5×/semana" },
  { id: "high", title: "Alto", desc: "Treino pesado 6–7×/semana" },
  { id: "very_high", title: "Muito alto", desc: "Treino pesado + trabalho físico, ou 2×/dia" },
];
const fx = (n: number) => String(n).replace(".", ",");

function Step({ n, title, desc, onBack, children, actions }: { n: number; title: string; desc?: string; onBack?: () => void; children?: ReactNode; actions: ReactNode }) {
  return (
    <div className="ctx-white min-h-dvh bg-bg">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between gap-6 px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="grid content-start gap-5">
          <div className="flex h-11 items-center justify-between">
            {onBack ? (
              <button onClick={onBack} className="t-body -ml-1 flex items-center gap-0.5 text-link active:opacity-60">
                <Icon name="cl" size={24} sw={2} />
                Voltar
              </button>
            ) : (
              <span />
            )}
            <span className="t-small text-tx2">Passo {n} de 6</span>
          </div>
          <div className="flex gap-1" role="progressbar" aria-valuenow={n} aria-valuemin={1} aria-valuemax={6} aria-label="Passos">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i < n ? "bg-blue" : "bg-bd"}`} />
            ))}
          </div>
          <div className="grid gap-2 pt-1">
            <h1 className="t-t28">{title}</h1>
            {desc && <p className="t-body text-tx2">{desc}</p>}
          </div>
          {children}
        </div>
        <div className="grid gap-1">{actions}</div>
      </main>
    </div>
  );
}

type DietChoice = "manual" | "backup" | "pdf";
const useOnb = create<{ step: number; diet: DietChoice }>()(
  persist(() => ({ step: 1, diet: "manual" as DietChoice }), { name: "fuel-onb" }),
);

export function Onboarding() {
  const user = useStore((s) => s.user);
  const update = useStore((s) => s.updateUser);
  const setPrefs = usePrefs((s) => s.set);
  const push = useNav((s) => s.push);
  // passo e escolha ficam fora do componente: se a tela remontar, a pessoa continua de onde parou
  const step = useOnb((s) => s.step);
  const diet = useOnb((s) => s.diet);
  const setStep = (f: (n: number) => number) => useOnb.setState((s) => ({ step: f(s.step) }));
  const setDiet = (d: DietChoice) => useOnb.setState({ diet: d });
  const [perm, setPerm] = useState<string | null>(null);
  const backup = useBackupImport({ confirmReplace: false });

  const finish = (goDiet: boolean) => {
    useOnb.setState({ step: 1, diet: "manual" });
    update({ onboarded: true });
    if (goDiet) push({ id: "diet" });
  };
  const next = () => setStep((s) => s + 1);
  const back = step > 1 ? () => setStep((s) => s - 1) : undefined;

  if (step === 1)
    return (
      <Step n={1} title="Sobre você" desc="Usamos isso para calcular o seu gasto de energia." actions={<Button onClick={next}>Continuar</Button>}>
        <TextField label="Como quer ser chamado?" value={user.name} onChange={(e) => update({ name: e.target.value })} autoComplete="given-name" placeholder="Seu nome" />
        <div className="grid gap-1.5">
          <span className="t-small-sb">Sexo</span>
          <Segmented label="Sexo" value={user.sex} onChange={(sex) => update({ sex })} options={[{ id: "male", label: "Masculino" }, { id: "female", label: "Feminino" }]} />
        </div>
        <NumField label="Idade" value={user.age} onCommit={(n) => n && update({ age: n })} min={14} max={100} decimals={0} unit="anos" />
      </Step>
    );

  if (step === 2)
    return (
      <Step n={2} title="Suas medidas" desc="Pese-se em jejum para o número ficar mais fiel." onBack={back} actions={<Button onClick={next}>Continuar</Button>}>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Peso (kg)" value={user.weightKg} onCommit={(n) => n && update({ weightKg: n })} min={30} max={300} unit="kg" />
          <NumField label="Altura (cm)" value={user.heightCm} onCommit={(n) => n && update({ heightCm: n })} min={100} max={250} decimals={0} unit="cm" />
        </div>
        <NumField
          label="% de gordura (opcional)"
          hint="Se não souber, deixe em branco."
          value={user.bodyFatPct}
          onCommit={(n) => update({ bodyFatPct: n ?? undefined, leanMassKg: n === null ? undefined : Math.round(user.weightKg * (1 - n / 100) * 100) / 100 })}
          allowEmpty
          min={3}
          max={60}
          unit="%"
          placeholder="—"
        />
        <NumField label="Meta de água (ml)" hint={`Sugestão: 35 ml por kg → ${fmt(user.weightKg * 35)} ml.`} value={user.waterGoalMl} onCommit={(n) => n && update({ waterGoalMl: Math.round(n) })} min={500} max={10000} decimals={0} unit="ml" />
      </Step>
    );

  if (step === 3)
    return (
      <Step n={3} title="Seu nível de atividade" desc="Considere o dia todo, não só o treino. Trabalha sentado? Escolha um nível abaixo do que o treino sugere." onBack={back} actions={<Button onClick={next}>Continuar</Button>}>
        <div className="grid gap-2.5" role="radiogroup" aria-label="Nível de atividade">
          {LEVELS.map((l) => (
            <Choice key={l.id} title={l.title} desc={`${l.desc} · ×${fx(ACTIVITY_FACTORS[l.id])}`} selected={user.activityLevel === l.id} onClick={() => update({ activityLevel: l.id, activityFactor: ACTIVITY_FACTORS[l.id] })} />
          ))}
        </div>
      </Step>
    );

  if (step === 4)
    return (
      <Step n={4} title="Seu gasto estimado" desc="Esta é a sua base. O app calibra com o peso real depois." onBack={back} actions={<Button onClick={next}>Continuar</Button>}>
        <div className="pt-2">
          <p className="t-hero tnum">{fmt(calcGet(user))}</p>
          <p className="t-body text-tx2">kcal por dia (GET)</p>
        </div>
        <Group>
          <Row title="TMB (Mifflin-St Jeor)" value={`${fmt(calcBmr(user))} kcal`} chevron={false} />
          <Row title="Fator de atividade" value={`×${fx(user.activityFactor)}`} chevron={false} />
          <Row title="Meta de água" value={`${fmt(user.waterGoalMl / 1000, 1)} L por dia`} chevron={false} />
        </Group>
        <Banner>É uma estimativa. Depois de cerca de 2 semanas de pesagens, a aba Peso ajusta o fator para você.</Banner>
      </Step>
    );

  if (step === 5)
    return (
      <Step
        n={5}
        title="Como quer montar a dieta?"
        desc="Dá para mudar tudo depois, em Perfil › Minha dieta."
        onBack={back}
        actions={
          <>
            <Button onClick={() => (diet === "backup" ? backup.open() : next())}>{diet === "backup" ? "Escolher arquivo de backup" : "Continuar"}</Button>
            <Button variant="link" onClick={next}>Pular por enquanto</Button>
          </>
        }
      >
        <div className="grid gap-2.5" role="radiogroup" aria-label="Como montar a dieta">
          <Choice title="Montar manualmente" desc="Escolha refeições, alimentos e quantidades" selected={diet === "manual"} onClick={() => setDiet("manual")} />
          <Choice title="Restaurar um backup" desc="Arquivo .json exportado do FUEL" selected={diet === "backup"} onClick={() => setDiet("backup")} />
          <Choice title="Importar o PDF do nutricionista" desc="O app lê as refeições e monta o plano" selected={false} disabled badge="Em breve" onClick={() => setDiet("pdf")} />
        </div>
        {backup.input}
        {backup.msg && !backup.msg.ok && <Banner tone="err" icon="alert">{backup.msg.text}</Banner>}
      </Step>
    );

  const enable = async () => {
    const p = await askNotificationPermission();
    setPerm(p);
    if (p === "granted" || p === "unsupported") {
      setPrefs({ remindMeals: true, remindWater: true, remindWeight: true });
      finish(diet === "manual");
    }
  };
  return (
    <Step
      n={6}
      title="Quer lembretes?"
      desc="Avisos discretos para você não precisar abrir o app para lembrar."
      onBack={back}
      actions={
        <>
          <Button onClick={enable}>Ativar lembretes</Button>
          <Button variant="link" onClick={() => finish(diet === "manual")}>Agora não</Button>
        </>
      }
    >
      <div className="grid gap-[18px] pt-1">
        {[
          { i: "check", t: "Refeições", d: "No horário de cada refeição da dieta." },
          { i: "drop", t: "Água", d: "A cada 2 horas, até bater a meta." },
          { i: "trend", t: "Pesagem", d: "De manhã, em jejum, 2 a 3 vezes por semana." },
        ].map((x) => (
          <div key={x.t} className="flex items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue/10 text-blue"><Icon name={x.i as "check"} size={24} /></span>
            <div>
              <p className="t-body-sb">{x.t}</p>
              <p className="t-small text-tx2">{x.d}</p>
            </div>
          </div>
        ))}
      </div>
      {perm === "denied" && <Banner tone="warn" icon="alert">As notificações estão bloqueadas neste aparelho. Libere nos ajustes do navegador ou toque em “Agora não”.</Banner>}
      <p className="t-cap text-tx2">Os avisos aparecem enquanto o app está aberto ou instalado na Tela de Início.</p>
    </Step>
  );
}
