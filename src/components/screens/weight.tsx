"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calibrate, calibrationProgress, fmt, toDateKey, weightSeries } from "@/lib/calc";
import { useDay } from "@/lib/derived";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Banner, Button, Card, Chip, Group, Icon, LargeTitle, NavBar, NumField, Page, Progress, Ring, Row, Segmented, Sheet } from "../kit";

const TICK = { fill: "var(--c-tx2)", fontSize: 12 };
const shortDate = (key: string) => {
  const [, m, dd] = key.split("-");
  return `${dd}/${m}`;
};
const kgs = (n: number, d = 1) => `${fmt(n, d)} kg`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n), 1)} kg`;
const shiftKey = (key: string, days: number) => {
  const [y, m, dd] = key.split("-").map(Number);
  return toDateKey(new Date(y, m - 1, dd + days));
};

type Range = "7" | "30" | "90";

function WTip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; kg: number; avg7: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-bg px-3 py-2 shadow-product">
      <p className="t-body-sb tnum">{kgs(p.kg)}</p>
      <p className="t-cap text-tx2">
        {shortDate(p.date)} · média 7 dias {kgs(p.avg7)}
      </p>
    </div>
  );
}

export function WeightScreen() {
  const d = useDay();
  const { push, openSheet } = useNav();
  const [range, setRange] = useState<Range>("30");
  const series = useMemo(() => weightSeries(d.logs), [d.logs]);
  const prog = useMemo(() => calibrationProgress(d.logs, d.today), [d.logs, d.today]);

  const last = series.at(-1);
  const prev = series.length > 1 ? series.at(-2) : undefined;
  const delta = last && prev ? last.kg - prev.kg : null;
  const weekAgo = series.find((p) => p.date >= shiftKey(d.todayKey, -7));
  const delta7 = last && weekAgo && weekAgo.date !== last.date ? last.kg - weekAgo.kg : null;
  const visible = series.filter((p) => p.date >= shiftKey(d.todayKey, -Number(range)));
  const lows = visible.map((p) => p.kg);
  const yMin = lows.length ? Math.floor(Math.min(...lows) - 1) : 90;
  const yMax = lows.length ? Math.ceil(Math.max(...lows) + 1) : 100;
  const recent = [...series].reverse().slice(0, 7);
  const hasToday = d.log?.weightKg !== undefined;

  return (
    <Page>
      <LargeTitle title="Peso" sub="Em jejum, de manhã" />

      <Card className="grid gap-3 p-5">
        <p className="t-cap-sb tracking-wide text-tx2 uppercase">{last ? (last.date === d.todayKey ? "Hoje" : `Última pesagem · ${shortDate(last.date)}`) : "Sem pesagens"}</p>
        <p className="t-hero tnum">
          {last ? fmt(last.kg, 1) : "—"} <span className="t-t28 text-tx2">kg</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {delta !== null && <Chip tone={delta <= 0 ? "ok" : "err"}>{signed(delta)} vs. anterior</Chip>}
          {delta7 !== null && <Chip tone={delta7 <= 0 ? "ok" : "err"}>{signed(delta7)} em 7 dias</Chip>}
          {last === undefined && <Chip tone="gray">Registre a primeira pesagem</Chip>}
        </div>
        <Button size="md" onClick={() => openSheet("weight")}>
          {hasToday ? "Editar peso de hoje" : "Registrar peso de hoje"}
        </Button>
      </Card>

      <Card className="grid gap-3">
        <Segmented<Range> label="Período" value={range} onChange={setRange} options={[{ id: "7", label: "7 dias" }, { id: "30", label: "30 dias" }, { id: "90", label: "90 dias" }]} />
        {visible.length < 2 ? (
          <p className="t-small py-6 text-center text-tx2">O gráfico aparece a partir da 2ª pesagem. Pese-se de manhã, em jejum, 2 a 3 vezes por semana.</p>
        ) : (
          <div className="h-48" role="img" aria-label="Peso ao longo do tempo">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visible.map((p) => ({ ...p, label: shortDate(p.date) }))} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--c-bd)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} />
                <YAxis tickLine={false} axisLine={false} domain={[yMin, yMax]} allowDecimals={false} tick={TICK} width={40} />
                <Tooltip cursor={{ stroke: "var(--c-tx2)", strokeOpacity: 0.4 }} content={<WTip />} />
                <Line dataKey="kg" stroke="var(--c-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={{ r: 4, fill: "var(--c-bg)", stroke: "var(--c-blue)", strokeWidth: 2.5 }} activeDot={{ r: 5, fill: "var(--c-blue)" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="grid gap-2">
        <button onClick={() => push({ id: "calibration" })} className="flex items-center justify-between text-left">
          <span>
            <span className="t-body-sb block">Calibração do GET</span>
            <span className="t-small text-tx2">
              {prog.days >= prog.needDays && prog.weighIns >= prog.needWeighIns
                ? "Dados suficientes: veja o seu gasto real"
                : `${prog.days} de ${prog.needDays} dias · faltam ${Math.max(0, prog.needDays - prog.days)}`}
            </span>
          </span>
          <Icon name="cr" size={20} sw={2} className="text-tx2" />
        </button>
        <Progress value={prog.days / prog.needDays} label="Dias para calibrar" />
      </Card>

      {recent.length > 0 && (
        <>
          <h2 className="t-t21 px-1 pt-2">Últimas pesagens</h2>
          <Group>
            {recent.map((p, i) => {
              const before = recent[i + 1];
              const dl = before ? p.kg - before.kg : null;
              return (
                <div key={p.date} className="flex items-center justify-between px-4 py-3">
                  <span className="t-body">
                    {shortDate(p.date)}
                    {p.date === d.todayKey ? " · hoje" : ""}
                  </span>
                  <span className="flex items-center gap-3">
                    {dl !== null && <span className={`t-small tnum ${dl < 0 ? "text-ok" : dl > 0 ? "text-err" : "text-tx2"}`}>{signed(dl)}</span>}
                    <span className="t-body-sb tnum">{kgs(p.kg)}</span>
                  </span>
                </div>
              );
            })}
          </Group>
        </>
      )}
    </Page>
  );
}

// ───────────── Registrar peso (folha) ─────────────

export function WeightSheet() {
  const sheet = useNav((s) => s.sheet);
  const openSheet = useNav((s) => s.openSheet);
  const d = useDay();
  const setWeight = useStore((s) => s.setWeight);
  const series = useMemo(() => weightSeries(d.logs), [d.logs]);
  const todayKg = d.log?.weightKg;
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? todayKg ?? series.at(-1)?.kg ?? d.user.weightKg;
  const round = (n: number) => Math.round(n * 10) / 10;
  const close = () => {
    setDraft(null);
    openSheet(null);
  };

  return (
    <Sheet open={sheet === "weight"} title="Registrar peso" onClose={close}>
      <div className="grid gap-4">
        <div className="grid gap-1 text-center">
          <NumField ariaLabel="Peso em kg" value={value} onCommit={(n) => n && setDraft(round(n))} min={30} max={300} decimals={1} unit="kg" big />
          <p className="t-small text-tx2">Hoje · em jejum</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" size="md" onClick={() => setDraft(round(Math.max(30, value - 0.1)))}>−0,1</Button>
          <Button variant="outline" size="md" onClick={() => setDraft(round(Math.min(300, value + 0.1)))}>+0,1</Button>
        </div>
        <Banner>Pese-se de manhã, depois de ir ao banheiro e antes de comer. 2 a 3 vezes por semana já calibram o app.</Banner>
        <div className="grid gap-1">
          <Button onClick={() => { haptic(12); setWeight(d.todayKey, round(value)); close(); }}>Salvar</Button>
          {todayKg !== undefined && (
            <Button variant="link" danger onClick={() => { setWeight(d.todayKey, null); close(); }}>
              Remover pesagem de hoje
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ───────────── Calibração do GET ─────────────

export function CalibrationScreen() {
  const d = useDay();
  const pop = useNav((s) => s.pop);
  const setTab = useNav((s) => s.setTab);
  const updateUser = useStore((s) => s.updateUser);
  const cal = useMemo(() => calibrate(d.logs, d.bmr, d.today), [d.logs, d.bmr, d.today]);
  const prog = useMemo(() => calibrationProgress(d.logs, d.today), [d.logs, d.today]);

  if (cal.ok) {
    const factor = Math.round(cal.factor * 100) / 100;
    const same = Math.abs(factor - d.user.activityFactor) < 0.005;
    return (
      <Page tabbar={false}>
        <NavBar back="Peso" onBack={pop} />
        <div>
          <h1 className="t-t28">Seu gasto real</h1>
          <p className="t-body text-tx2">Com {cal.weighIns} pesagens em {cal.days} dias, o app comparou o que você comeu com o que o peso fez.</p>
        </div>
        <Card className="grid gap-1 p-5">
          <p className="t-cap-sb tracking-wide text-tx2 uppercase">GET observado</p>
          <p className="t-hero tnum">
            {fmt(cal.observedGet)} <span className="t-t21 text-tx2">kcal/dia</span>
          </p>
          <p className="t-body text-tx2">fator {fmt(cal.factor, 2)}</p>
        </Card>
        <Group>
          <Row title="Hoje o app usa" value={`${fmt(d.get)} kcal · ×${fmt(d.user.activityFactor, 2)}`} />
          <Row title="Ingestão média" value={`${fmt(cal.avgIntake)} kcal/dia`} />
          <Row title="Tendência do peso" value={`${cal.slopeKgWeek <= 0 ? "−" : "+"}${fmt(Math.abs(cal.slopeKgWeek), 2)} kg por semana`} />
        </Group>
        <Banner>Aplicar muda o seu GET e, com ele, o déficit mostrado em Hoje e Semana. Você pode voltar ao fator anterior quando quiser, em Perfil e metas.</Banner>
        <div className="grid gap-1 pt-1">
          <Button disabled={same} onClick={() => { updateUser({ activityFactor: factor }); pop(); }}>
            {same ? "Fator já aplicado" : `Aplicar fator ${fmt(factor, 2)}`}
          </Button>
          <Button variant="link" onClick={pop}>Manter {fmt(d.user.activityFactor, 2)}</Button>
        </div>
      </Page>
    );
  }

  const reqs = [
    { t: "Pelo menos 4 pesagens", v: `${prog.weighIns} de ${prog.needWeighIns}`, ok: prog.weighIns >= prog.needWeighIns },
    { t: "Pelo menos 14 dias de registro", v: `${prog.days} de ${prog.needDays}`, ok: prog.days >= prog.needDays },
    { t: "Refeições marcadas em 70% dos dias", v: `${prog.coveragePct}%`, ok: prog.coveragePct >= prog.needCoveragePct },
  ];

  return (
    <Page tabbar={false}>
      <NavBar back="Peso" onBack={pop} />
      <div>
        <h1 className="t-t28">Calibração do GET</h1>
        <p className="t-body text-tx2">O app compara o que você comeu com o que o peso fez e estima o seu gasto real.</p>
      </div>
      <Card className="flex flex-col items-center gap-3 p-5">
        <Ring size={140} value={Math.min(1, prog.days / prog.needDays)}>
          <div>
            <p className="t-t28 tnum">{Math.min(prog.days, prog.needDays)} de {prog.needDays}</p>
            <p className="t-cap text-tx2">dias de registro</p>
          </div>
        </Ring>
        <p className="t-small text-tx2">{prog.days >= prog.needDays ? cal.reason : `Faltam ${prog.needDays - prog.days} dias para a primeira calibração.`}</p>
      </Card>
      <Group>
        {reqs.map((r) => (
          <div key={r.t} className="flex items-center gap-3 px-4 py-3.5">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full ${r.ok ? "bg-ok text-white" : "border-[1.5px] border-tx2"}`}>{r.ok && <Icon name="check" size={14} sw={3} />}</span>
            <span className="t-body flex-1">{r.t}</span>
            <span className={`t-small tnum ${r.ok ? "text-ok" : "text-tx2"}`}>{r.v}</span>
          </div>
        ))}
      </Group>
      <p className="t-cap px-1 text-center text-tx2">Vale se você marcar tudo o que come. Marque as refeições todos os dias.</p>
      <Button variant="outline" onClick={() => setTab("today")}>Marcar refeições de hoje</Button>
    </Page>
  );
}
