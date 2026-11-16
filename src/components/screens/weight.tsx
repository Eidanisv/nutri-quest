"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KCAL_PER_KG, calibrate, calibrationProgress, deficitBetween, fmt, monthlyWeights, toDateKey, weeklyWeights, weightSeries, type WeightPeriod } from "@/lib/calc";
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

type View = "weeks" | "months";

function PTip({ active, payload }: { active?: boolean; payload?: { payload: WeightPeriod }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-bg px-3 py-2 shadow-product">
      <p className="t-body-sb tnum">{kgs(p.avg)}</p>
      <p className="t-cap text-tx2">
        {p.label} · {p.n} {p.n === 1 ? "pesagem" : "pesagens"}
      </p>
    </div>
  );
}

/** Evolução do peso por semana ou por mês, com o que o déficit previa contra o que a balança mostrou. */
function Evolution({ logs, todayKey }: { logs: ReturnType<typeof useDay>["logs"]; todayKey: string }) {
  const [view, setView] = useState<View>("weeks");
  const weeks = useMemo(() => weeklyWeights(logs, 5), [logs]);
  const months = useMemo(() => monthlyWeights(logs, 6), [logs]);
  const rows = view === "weeks" ? weeks : months;
  const unit = view === "weeks" ? "semana" : "mês";
  const first = rows[0];
  const last = rows.at(-1);
  const total = first && last && rows.length > 1 ? last.avg - first.avg : null;
  const perPeriod = total !== null ? total / (rows.length - 1) : null;
  const avgs = rows.map((r) => r.avg);
  const yMin = avgs.length ? Math.floor(Math.min(...avgs) - 0.5) : 0;
  const yMax = avgs.length ? Math.ceil(Math.max(...avgs) + 0.5) : 1;
  const maxAbs = Math.max(0.1, ...rows.map((r) => Math.abs(r.delta ?? 0)));

  // déficit estimado × balança (só na visão por semana)
  let est: { kcal: number; days: number } | null = null;
  if (view === "weeks" && first && last && rows.length > 1) {
    const [y, m, dd] = last.key.split("-").map(Number);
    est = deficitBetween(logs, first.key, toDateKey(new Date(y, m - 1, dd + 6)), todayKey);
    if (est.days < 3) est = null;
  }

  return (
    <>
      <Segmented<View> label="Período" value={view} onChange={setView} options={[{ id: "weeks", label: "Semanas" }, { id: "months", label: "Meses" }]} />

      {total === null ? (
        <Card className="grid gap-1 py-8 text-center">
          <p className="t-body-sb">{view === "weeks" ? "A evolução semanal aparece com 2 semanas de pesagem" : "A evolução mensal aparece com 2 meses de pesagem"}</p>
          <p className="t-small text-tx2">Pese-se de manhã, em jejum, 2 a 3 vezes por semana. O app usa a média de cada {unit}.</p>
        </Card>
      ) : (
        <>
          <Card className="grid gap-2 p-5">
            <p className="t-cap-sb tracking-wide text-tx2 uppercase">
              {view === "weeks" ? `Últimas ${rows.length} semanas` : `Últimos ${rows.length} meses`}
            </p>
            <p className={`t-hero tnum ${total <= 0 ? "text-ok" : "text-err"}`}>
              {total <= 0 ? "−" : "+"}
              {fmt(Math.abs(total), 1)} <span className="t-t28 text-tx2">kg</span>
            </p>
            <p className="t-body text-tx2">
              A média {view === "weeks" ? "semanal" : "mensal"} foi de {fmt(first.avg, 1)} para {fmt(last!.avg, 1)} kg.
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip tone={perPeriod! <= 0 ? "ok" : "err"}>
                {perPeriod! <= 0 ? "−" : "+"}
                {fmt(Math.abs(perPeriod!), 1)} kg por {unit}
              </Chip>
              {last!.delta !== null && (
                <Chip>
                  {view === "weeks" ? "Última semana" : "Último mês"} {signed(last!.delta)}
                </Chip>
              )}
            </div>
          </Card>

          <Card className="grid gap-3">
            <h2 className="t-t21">Peso médio por {unit}</h2>
            <div className="h-48" role="img" aria-label={`Peso médio por ${unit}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--c-bd)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} interval={0} tickFormatter={(v: string) => (view === "weeks" ? v.split(" a ")[0] : v)} />
                  <YAxis tickLine={false} axisLine={false} domain={[yMin, yMax]} allowDecimals={false} tick={TICK} width={40} />
                  <Tooltip cursor={{ stroke: "var(--c-tx2)", strokeOpacity: 0.4 }} content={<PTip />} />
                  <Line dataKey="avg" stroke="var(--c-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={{ r: 4, fill: "var(--c-bg)", stroke: "var(--c-blue)", strokeWidth: 2.5 }} activeDot={{ r: 5, fill: "var(--c-blue)" }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Group>
            <div className="t-t21 px-4 pt-3.5 pb-2.5">Variação por {unit}</div>
            {[...rows].reverse().map((r, i) => (
              <div key={r.key} className="flex items-center gap-3 px-4 py-3">
                <span className="w-[108px] shrink-0">
                  <span className={`block ${i === 0 ? "t-body-sb" : "t-body"}`}>{r.label}</span>
                  {i === 0 && <span className="t-cap text-tx2">mais recente</span>}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-bd/50">
                  {r.delta !== null && <span className={`block h-full rounded-full ${r.delta <= 0 ? "bg-ok" : "bg-err"}`} style={{ width: `${Math.max(6, (Math.abs(r.delta) / maxAbs) * 100)}%` }} />}
                </span>
                <span className={`t-small-sb tnum w-[68px] text-right ${r.delta === null ? "text-tx2" : r.delta <= 0 ? "text-ok" : "text-err"}`}>{r.delta === null ? "—" : signed(r.delta)}</span>
              </div>
            ))}
          </Group>

          {est && (
            <Card className="grid gap-2.5">
              <div>
                <h2 className="t-t21">Déficit × balança</h2>
                <p className="t-small text-tx2">Nas últimas {rows.length} semanas, só dias com refeições marcadas</p>
              </div>
              <div className="h-px bg-bd" />
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="t-body block">Déficit calórico</span>
                  <span className="t-cap text-tx2">{fmt(est.kcal)} kcal em {est.days} dias</span>
                </span>
                <span className="t-body-sb text-link tnum">
                  ≈ {est.kcal >= 0 ? "−" : "+"}
                  {fmt(Math.abs(est.kcal) / KCAL_PER_KG, 1)} kg
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="t-body block">Balança (média semanal)</span>
                  <span className="t-cap text-tx2">
                    {fmt(first.avg, 1)} → {fmt(last!.avg, 1)} kg
                  </span>
                </span>
                <span className={`t-body-sb tnum ${total <= 0 ? "text-ok" : "text-err"}`}>{signed(total)}</span>
              </div>
              <Banner>Se a balança acompanha o déficit, o gasto está certo. Variações de até 1 kg entre semanas são normais (água, sal, ciclo).</Banner>
            </Card>
          )}
        </>
      )}
    </>
  );
}

export function WeightScreen() {
  const d = useDay();
  const { push, openSheet } = useNav();
  const series = useMemo(() => weightSeries(d.logs), [d.logs]);
  const prog = useMemo(() => calibrationProgress(d.logs, d.today), [d.logs, d.today]);

  const last = series.at(-1);
  const prev = series.length > 1 ? series.at(-2) : undefined;
  const delta = last && prev ? last.kg - prev.kg : null;
  const weekAgo = series.find((p) => p.date >= shiftKey(d.todayKey, -7));
  const delta7 = last && weekAgo && weekAgo.date !== last.date ? last.kg - weekAgo.kg : null;
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

      <Evolution logs={d.logs} todayKey={d.todayKey} />

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
