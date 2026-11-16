"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KCAL_PER_KG, WORKOUT_LABEL, buildWeek, fmt, scoreTone, weekRangeLabel, workoutKcal, type WeekPoint } from "@/lib/calc";
import { useDay } from "@/lib/derived";
import { useNav } from "@/lib/nav";
import { Button, Card, Chip, Group, Icon, LargeTitle, Page } from "../kit";

const TICK = { fill: "var(--c-tx2)", fontSize: 12 };
const DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const f1 = (n: number) => String(n.toFixed(1)).replace(".", ",");

type Row = WeekPoint & { kcal: number; gasto: number | null };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const b = p.consumed === null ? null : p.get - p.consumed;
  return (
    <div className="rounded-xl bg-bg px-3 py-2 shadow-product">
      {p.consumed === null ? (
        <p className="t-small text-tx2">{p.label} · sem registro</p>
      ) : (
        <>
          <p className="t-body-sb tnum">{fmt(p.consumed)} kcal comidas</p>
          <p className="t-cap text-tx2">
            Gasto {fmt(p.get)}
            {p.workout ? ` (com treino)` : ""}
          </p>
          <p className="t-cap-sb">
            {b! >= 0 ? "−" : "+"}
            {fmt(Math.abs(b!))} kcal ({b! >= 0 ? "déficit" : "superávit"})
          </p>
        </>
      )}
    </div>
  );
}

/** Bolinha da nota do dia: cor pela nota, número dentro. */
function ScoreDot({ score }: { score: number | null }) {
  if (score === null) return <span className="t-cap grid size-[34px] place-items-center rounded-full border border-bd text-tx2">—</span>;
  const bg = { ok: "bg-ok", warn: "bg-warn", err: "bg-err" }[scoreTone(score)];
  return <span className={`grid size-[34px] place-items-center rounded-full text-[12px] leading-none font-semibold text-white tnum ${bg}`}>{f1(score)}</span>;
}

export function WeekScreen() {
  const d = useDay();
  const openSheet = useNav((s) => s.openSheet);
  const setTab = useNav((s) => s.setTab);
  const week = useMemo(() => buildWeek(d.logs, d.get, d.today), [d.logs, d.get, d.today]);
  const points = week.points.map((p) => (p.isToday ? { ...p, score: d.score, workout: d.workout } : p));

  const closed = points.filter((p) => p.consumed !== null && p.date < d.todayKey);
  const gasto = closed.reduce((a, p) => a + p.get, 0);
  const comido = closed.reduce((a, p) => a + (p.consumed ?? 0), 0);
  const deficit = week.closedBalance >= 0;
  const kg = Math.abs(week.closedBalance) / KCAL_PER_KG;
  const trained = points.filter((p) => p.workout);
  const trainKcal = trained.reduce((a, p) => a + workoutKcal(p.workout, d.user.weightKg), 0);
  const scored = points.filter((p) => p.score !== null);
  const avgScore = scored.length ? scored.reduce((a, p) => a + (p.score as number), 0) / scored.length : null;
  const hasAny = points.some((p) => p.consumed !== null || p.workout);

  const data: Row[] = points.map((p) => ({ ...p, kcal: p.consumed ?? 0, gasto: p.consumed !== null || p.workout || p.isToday ? p.get : null }));
  const yTop = Math.max(2000, Math.ceil((Math.max(...points.map((p) => Math.max(p.get, p.consumed ?? 0))) * 1.08) / 1000) * 1000);
  const ticks = Array.from({ length: yTop / 1000 + 1 }, (_, i) => i * 1000);

  const openDay = (p: WeekPoint) => {
    if (p.date <= d.todayKey) openSheet("workout", p.date);
  };

  if (!hasAny)
    return (
      <Page>
        <LargeTitle title="Semana" sub={weekRangeLabel(d.today)} />
        <Card className="flex flex-col items-center gap-3 px-6 py-9 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-blue/10 text-blue">
            <Icon name="chart" size={30} />
          </span>
          <h2 className="t-t21">Sua semana começa aqui</h2>
          <p className="t-small text-tx2">Marque as refeições na aba Dieta e o treino em Hoje. O resumo da semana, a nota da dieta e o gasto aparecem aqui.</p>
          <Button size="md" className="mt-1 w-full" onClick={() => setTab("diet")}>
            Ir para a Dieta
          </Button>
        </Card>
      </Page>
    );

  return (
    <Page>
      <LargeTitle title="Semana" sub={weekRangeLabel(d.today)} />

      <Card className="grid gap-2.5 p-5">
        <p className="t-cap-sb tracking-wide text-tx2 uppercase">Resultado da semana</p>
        <p className={`t-hero tnum ${closed.length === 0 ? "text-tx2" : deficit ? "text-ok" : "text-err"}`}>
          {closed.length === 0 ? "—" : `${deficit ? "−" : "+"}${fmt(Math.abs(week.closedBalance))}`}
        </p>
        <p className="t-body text-tx2">
          {closed.length === 0 ? "O saldo aparece quando o primeiro dia fechar." : `kcal de ${deficit ? "déficit" : "superávit"} real nos dias fechados (até ontem)`}
        </p>
        {closed.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Chip tone={deficit ? "ok" : "err"}>≈ {fmt(kg, 2)} kg de gordura</Chip>
            {week.todayBalance !== 0 && (
              <Chip>
                Hoje: {week.todayBalance >= 0 ? "−" : "+"}
                {fmt(Math.abs(week.todayBalance))} parcial
              </Chip>
            )}
          </div>
        )}
        <div className="h-px bg-bd" />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="t-cap-sb tracking-wide text-tx2 uppercase">Gasto</p>
            <p className="t-body-sb tnum">{closed.length ? fmt(gasto) : "—"}</p>
            <p className="t-cap text-tx2">kcal</p>
          </div>
          <div>
            <p className="t-cap-sb tracking-wide text-tx2 uppercase">Comido</p>
            <p className="t-body-sb tnum">{closed.length ? fmt(comido) : "—"}</p>
            <p className="t-cap text-tx2">kcal</p>
          </div>
          <div>
            <p className="t-cap-sb tracking-wide text-tx2 uppercase">Treinos</p>
            <p className="t-body-sb tnum">{trained.length} {trained.length === 1 ? "dia" : "dias"}</p>
            <p className="t-cap text-tx2">+{fmt(trainKcal)} kcal</p>
          </div>
        </div>
      </Card>

      <Card className="grid gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-t21">Nota da dieta</h2>
          <span className={`t-small-sb tnum ${avgScore === null ? "text-tx2" : { ok: "text-ok", warn: "text-warn", err: "text-err" }[scoreTone(avgScore)]}`}>
            {avgScore === null ? "—" : `média ${f1(avgScore)} de 10`}
          </span>
        </div>
        <div className="grid grid-cols-7">
          {points.map((p) => (
            <div key={p.date} className="flex flex-col items-center gap-1.5">
              <ScoreDot score={p.score} />
              <span className={`t-cap ${p.isToday ? "font-semibold text-tx" : "text-tx2"}`}>{p.label}</span>
            </div>
          ))}
        </div>
        <p className="t-cap text-tx2">10 = comeu tudo o que estava no plano. 1 = não fez a dieta. A nota sai do que você marcou: metade das calorias comidas, metade dos itens.</p>
      </Card>

      <Card className="grid gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-t21">Treino</h2>
          <span className="t-small-sb text-link">{trained.length} de 7 dias</span>
        </div>
        <div className="grid grid-cols-7">
          {points.map((p) => {
            const future = p.date > d.todayKey;
            return (
              <button key={p.date} disabled={future} onClick={() => openDay(p)} aria-label={`${p.label}: ${p.workout ? WORKOUT_LABEL[p.workout] : "sem treino"}. Alterar`} className="flex flex-col items-center gap-1.5 disabled:opacity-40">
                <span className={`grid size-[34px] place-items-center rounded-full ${p.workout ? "bg-blue text-white" : "bg-bd/60 text-tx2"}`}>
                  <Icon name="dumb" size={18} sw={2.2} />
                </span>
                <span className={`t-cap ${p.isToday ? "font-semibold text-tx" : "text-tx2"}`}>{p.label}</span>
              </button>
            );
          })}
        </div>
        <p className="t-cap text-tx2">Toque em um dia para marcar ou corrigir o treino. Dia com treino soma as kcal do treino ao gasto base.</p>
      </Card>

      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-t21">Comido × gasto</h2>
          <ul className="t-cap flex gap-3 text-tx2">
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-blue" />comido</li>
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-blue/20" />gasto</li>
          </ul>
        </div>
        <div className="h-56" role="img" aria-label="Calorias comidas por dia contra o gasto do dia">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--c-bd)" vertical={false} />
              <XAxis xAxisId="g" dataKey="label" tickLine={false} axisLine={false} tick={TICK} />
              <XAxis xAxisId="c" dataKey="label" hide />
              <YAxis tickLine={false} axisLine={false} domain={[0, yTop]} ticks={ticks} tick={TICK} width={40} tickFormatter={(v: number) => fmt(v)} />
              <Tooltip cursor={{ fill: "var(--c-sup)" }} content={<Tip />} />
              <Bar xAxisId="g" dataKey="gasto" fill="var(--c-blue)" fillOpacity={0.2} radius={[6, 6, 0, 0]} barSize={26} isAnimationActive={false} />
              <Bar xAxisId="c" dataKey="kcal" radius={[5, 5, 0, 0]} barSize={14} isAnimationActive={false}>
                {data.map((p) => (
                  <Cell key={p.date} fill={p.consumed !== null && p.consumed > p.get ? "var(--c-err)" : "var(--c-blue)"} fillOpacity={p.isToday ? 0.45 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Group>
        {points.map((p, i) => {
          const b = p.consumed === null ? null : p.get - p.consumed;
          return (
            <div key={p.date} className="flex items-center justify-between gap-2 px-4 py-3">
              <span className={`flex items-center gap-1.5 ${p.isToday ? "t-body-sb" : "t-body"}`}>
                {DAYS_FULL[i]}
                {p.isToday ? " · hoje" : ""}
                {p.workout && <Icon name="dumb" size={15} sw={2.2} className="text-blue" />}
              </span>
              <span className="flex items-center gap-3">
                <span className="t-small tnum text-tx2">{p.consumed === null ? "—" : `${fmt(p.consumed)} / ${fmt(p.get)}`}</span>
                <span className={`t-small-sb tnum w-14 text-right ${b === null ? "text-tx2" : p.isToday ? "text-tx2" : b >= 0 ? "text-ok" : "text-err"}`}>
                  {b === null ? "—" : `${b >= 0 ? "−" : "+"}${fmt(Math.abs(b))}`}
                </span>
              </span>
            </div>
          );
        })}
      </Group>
      <p className="t-cap px-1 text-tx2">Cada dia: comido / gasto e o saldo. O gasto é o dia a dia mais o treino marcado. Referência: 7.700 kcal ≈ 1 kg de gordura.</p>
    </Page>
  );
}
