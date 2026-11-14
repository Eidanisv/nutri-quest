"use client";

import { useState } from "react";
import { calcBmr, calcGet, fmt } from "@/lib/calc";
import { useNav } from "@/lib/nav";
import { askNotificationPermission, notificationsSupported, usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { ACTIVITY_FACTORS, type ActivityLevel } from "@/lib/types";
import { Avatar, Banner, Card, Choice, Group, Icon, LargeTitle, NavBar, NumField, Page, Row, Segmented, TextField, Toggle } from "../kit";
import { LEVELS } from "./onboarding";

const fx = (n: number) => String(n).replace(".", ",");

export function ProfileScreen() {
  const push = useNav((s) => s.push);
  const user = useStore((s) => s.user);
  const plan = useStore((s) => s.plan);
  const foods = useStore((s) => s.foods);
  const { status, email } = useSync();
  const prefs = usePrefs();
  const remOn = prefs.remindMeals || prefs.remindWater || prefs.remindWeight;
  const synced = status === "idle" || status === "syncing";

  return (
    <Page>
      <LargeTitle title="Perfil" />
      <Group>
        <button onClick={() => push({ id: "account" })} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-sup">
          <Avatar name={user.name} size={56} />
          <span className="min-w-0 flex-1">
            <span className="t-body-sb block">{user.name || "Sem nome"}</span>
            <span className="t-small block truncate text-tx2">{email ?? (status === "unconfigured" ? "Só neste aparelho" : "Sem conta · toque para entrar")}</span>
            {synced && (
              <span className="t-cap-sb mt-0.5 flex items-center gap-1 text-ok">
                <Icon name="check" size={13} sw={3} />
                Sincronizado
              </span>
            )}
          </span>
          <Icon name="cr" size={18} sw={2} className="text-tx2/70" />
        </button>
      </Group>
      <Group>
        <Row icon="target" title="Perfil e metas" value={`GET ${fmt(calcGet(user))}`} onClick={() => push({ id: "profile-edit" })} />
        <Row icon="coffee" title="Minha dieta" value={`${plan.meals.length} ${plan.meals.length === 1 ? "refeição" : "refeições"}`} onClick={() => push({ id: "diet" })} />
        <Row icon="search" title="Catálogo de alimentos" value={`${foods.length} itens`} onClick={() => push({ id: "foods" })} />
      </Group>
      <Group>
        <Row icon="bell" title="Lembretes" value={remOn ? "Ativados" : "Desativados"} onClick={() => push({ id: "reminders" })} />
        <Row icon="cloud" title="Conta e sincronização" onClick={() => push({ id: "account" })} />
        <Row icon="dl" title="Dados e backup" onClick={() => push({ id: "data" })} />
      </Group>
      <Group>
        <Row icon="info" tone="gray" title="Sobre o FUEL" value="Versão 1.0" onClick={() => push({ id: "about" })} />
      </Group>
    </Page>
  );
}

// ───────────── Perfil e metas ─────────────

export function ProfileEditScreen() {
  const pop = useNav((s) => s.pop);
  const push = useNav((s) => s.push);
  const user = useStore((s) => s.user);
  const update = useStore((s) => s.updateUser);
  const level = LEVELS.find((l) => l.id === user.activityLevel);

  return (
    <Page tabbar={false}>
      <NavBar back="Perfil" onBack={pop} right={<span className="t-small text-tx2">Salvo automaticamente</span>} />
      <div>
        <h1 className="t-t28">Perfil e metas</h1>
        <p className="t-body text-tx2">Mudanças refazem o seu GET na hora.</p>
      </div>
      <Card className="grid gap-4">
        <TextField label="Nome" value={user.name} onChange={(e) => update({ name: e.target.value })} placeholder="Como quer ser chamado" />
        <div className="grid gap-1.5">
          <span className="t-small-sb">Sexo</span>
          <Segmented label="Sexo" value={user.sex} onChange={(sex) => update({ sex })} options={[{ id: "male", label: "Masculino" }, { id: "female", label: "Feminino" }]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Idade" value={user.age} onCommit={(n) => n && update({ age: n })} min={14} max={100} decimals={0} unit="anos" />
          <NumField label="Peso (kg)" value={user.weightKg} onCommit={(n) => n && update({ weightKg: n })} min={30} max={300} unit="kg" />
          <NumField label="Altura (cm)" value={user.heightCm} onCommit={(n) => n && update({ heightCm: n })} min={100} max={250} decimals={0} unit="cm" />
          <NumField
            label="% de gordura"
            value={user.bodyFatPct}
            onCommit={(n) => update({ bodyFatPct: n ?? undefined, leanMassKg: n === null ? undefined : Math.round(user.weightKg * (1 - n / 100) * 100) / 100 })}
            allowEmpty
            min={3}
            max={60}
            unit="%"
            placeholder="—"
          />
        </div>
        <NumField label="Meta de água (ml)" hint="Sugestão: 35 ml por kg de peso." value={user.waterGoalMl} onCommit={(n) => n && update({ waterGoalMl: Math.round(n) })} min={500} max={10000} decimals={0} unit="ml" />
      </Card>
      <Group>
        <Row icon="trend" title="Nível de atividade" value={`${level?.title ?? "Personalizado"} ×${fx(user.activityFactor)}`} onClick={() => push({ id: "activity" })} />
      </Group>
      <Card className="grid gap-1 p-[18px]">
        <p className="t-cap-sb tracking-wide text-tx2 uppercase">Seu gasto estimado</p>
        <p className="t-t40 tnum">
          {fmt(calcGet(user))} <span className="t-body font-normal text-tx2">kcal/dia (GET)</span>
        </p>
        <p className="t-small text-tx2">TMB {fmt(calcBmr(user))} kcal (Mifflin-St Jeor) × {fx(user.activityFactor)}. Melhora com o peso registrado.</p>
      </Card>
    </Page>
  );
}

export function ActivityScreen() {
  const pop = useNav((s) => s.pop);
  const user = useStore((s) => s.user);
  const update = useStore((s) => s.updateUser);
  return (
    <Page tabbar={false}>
      <NavBar back="Perfil e metas" onBack={pop} />
      <div>
        <h1 className="t-t28">Nível de atividade</h1>
        <p className="t-body text-tx2">Considere o dia todo, não só o treino. Trabalha sentado? Escolha um nível abaixo do que o treino sugere. A aba Peso calibra isso depois, com o seu peso real.</p>
      </div>
      <div className="grid gap-2.5" role="radiogroup" aria-label="Nível de atividade">
        {LEVELS.map((l) => (
          <Choice key={l.id} title={l.title} desc={`${l.desc} · ×${fx(ACTIVITY_FACTORS[l.id as ActivityLevel])}`} selected={user.activityLevel === l.id && user.activityFactor === ACTIVITY_FACTORS[l.id]} onClick={() => update({ activityLevel: l.id, activityFactor: ACTIVITY_FACTORS[l.id] })} />
        ))}
      </div>
      <Card>
        <NumField label="Fator exato" hint="Ajuste fino, se você já conhece o seu." value={user.activityFactor} onCommit={(n) => n && update({ activityFactor: n })} min={1.1} max={2.5} decimals={2} />
      </Card>
    </Page>
  );
}

// ───────────── Lembretes ─────────────

export function RemindersScreen() {
  const pop = useNav((s) => s.pop);
  const prefs = usePrefs();
  const [perm, setPerm] = useState<string | null>(null);

  const turn = async (key: "remindMeals" | "remindWater" | "remindWeight", on: boolean) => {
    if (on) {
      const p = await askNotificationPermission();
      setPerm(p);
      if (p === "denied") return;
    }
    prefs.set({ [key]: on });
  };
  const supported = notificationsSupported();

  return (
    <Page tabbar={false}>
      <NavBar back="Perfil" onBack={pop} />
      <div>
        <h1 className="t-t28">Lembretes</h1>
        <p className="t-body text-tx2">Avisos discretos, sem som de alarme.</p>
      </div>
      {(perm === "denied" || (perm === "unsupported") || !supported) && (
        <Banner tone="warn" icon="alert">
          {perm === "denied" ? "As notificações estão bloqueadas neste aparelho. Libere nos ajustes do navegador." : "Este navegador não mostra notificações. No iPhone, adicione o FUEL à Tela de Início para receber avisos."}
        </Banner>
      )}
      <Group>
        <Row icon="coffee" title="Refeições" sub="No horário de cada refeição" chevron={false} right={<Toggle label="Lembrar das refeições" on={prefs.remindMeals} onChange={(v) => void turn("remindMeals", v)} />} />
        <Row icon="drop" title="Água" sub="A cada 2 horas, das 8h às 20h" chevron={false} right={<Toggle label="Lembrar de beber água" on={prefs.remindWater} onChange={(v) => void turn("remindWater", v)} />} />
        <Row icon="trend" title="Pesagem" sub="Seg, qua e sex, a partir das 7h" chevron={false} right={<Toggle label="Lembrar de pesar" on={prefs.remindWeight} onChange={(v) => void turn("remindWeight", v)} />} />
      </Group>
      <Group>
        <Row title="Avisar antes da refeição" value={`${prefs.leadMin} min`} chevron={false} right={
          <div className="flex gap-1">
            {[0, 10, 30].map((m) => (
              <button key={m} onClick={() => prefs.set({ leadMin: m })} aria-pressed={prefs.leadMin === m} className={`t-cap-sb rounded-full px-2.5 py-1 ${prefs.leadMin === m ? "bg-blue text-white" : "bg-sup text-tx2"}`}>{m === 0 ? "na hora" : `${m} min`}</button>
            ))}
          </div>
        } />
        <Row title="Silêncio à noite" sub="Sem avisos das 22h às 7h" chevron={false} right={<Toggle label="Silêncio à noite" on={prefs.quiet} onChange={(v) => prefs.set({ quiet: v })} />} />
      </Group>
      <p className="t-cap px-1 text-tx2">Os avisos aparecem enquanto o app está aberto ou instalado na Tela de Início. Eles ficam só neste aparelho.</p>
    </Page>
  );
}

export function AboutScreen() {
  const pop = useNav((s) => s.pop);
  return (
    <Page tabbar={false}>
      <NavBar back="Perfil" onBack={pop} />
      <div className="grid justify-items-center gap-3 pt-6 text-center">
        <span className="grid size-[72px] place-items-center rounded-[18px] bg-blue text-white"><Icon name="flame" size={36} sw={2} /></span>
        <h1 className="t-t28">FUEL</h1>
        <p className="t-small text-tx2">Versão 1.0</p>
      </div>
      <Card className="grid gap-2">
        <p className="t-small">Refeições com macros, água, compras da semana, peso e déficit calórico, com o gasto calibrado pelo seu peso real.</p>
        <p className="t-small text-tx2">Seus dados ficam neste aparelho. Se você entra com uma conta, eles também ficam na nuvem, e só você os acessa. As calorias dos alimentos vêm da tabela TACO e são aproximadas: confira com o rótulo.</p>
        <p className="t-small text-tx2">O FUEL é uma ferramenta de acompanhamento e não substitui a orientação do seu nutricionista.</p>
      </Card>
    </Page>
  );
}
