"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KCAL_PER_KG, buildWeek, fmt, weekRangeLabel, type WeekPoint } from "@/lib/calc";
import { useDay } from "@/lib/derived";
import { Card, Chip, Group, LargeTitle, Page } from "../kit";

const TICK = { fill: "var(--c-tx2)", fontSize: 12 };
const DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

type Row = WeekPoint & { kcal: number };

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
          <p className="t-body-sb tnum">{fmt(p.consumed)} kcal</p>
          <p className="t-cap text-tx2">GET {fmt(p.get)}</p>
          <p className="t-cap-sb">
            {b! >= 0 ? "−" : "+"}
            {fmt(Math.abs(b!))} kcal ({b! >= 0 ? "déficit" : "superávit"})
          </p>
        </>
      )}
    </div>
  );
}

export function WeekScreen() {
  const d = useDay();
  const week = useMemo(() => buildWeek(d.logs, d.get, d.today), [d.logs, d.get, d.today]);
  const deficit = week.closedBalance >= 0;
  const yTop = Math.ceil((d.get * 1.15) / 1000) * 1000;
  const data: Row[] = week.points.map((p) => ({ ...p, kcal: p.consumed ?? 0 }));
  const kg = Math.abs(week.closedBalance) / KCAL_PER_KG;
  const hasAny = week.points.some((p) => p.consumed !== null);

  return (
    <Page>
      <LargeTitle title="Semana" sub={weekRangeLabel(d.today)} />

      <Card className="grid gap-1.5 p-5">
        <p className="t-cap-sb tracking-wide text-tx2 uppercase">Saldo acumulado</p>
        <p className={`t-hero tnum ${deficit ? "text-ok" : "text-err"}`}>
          {deficit ? "−" : "+"}
          {fmt(Math.abs(week.closedBalance))}
        </p>
        <p className="t-body text-tx2">kcal de {deficit ? "déficit" : "superávit"} nos dias fechados (até ontem)</p>
        <div className="flex flex-wrap gap-2 pt-1.5">
          <Chip tone={deficit ? "ok" : "err"}>
            ≈ {fmt(kg, 2)} kg de gordura
          </Chip>
          {week.todayBalance !== 0 && (
            <Chip>
              Hoje: {week.todayBalance >= 0 ? "−" : "+"}
              {fmt(Math.abs(week.todayBalance))} parcial
            </Chip>
          )}
        </div>
      </Card>

      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-t21">Consumido × GET</h2>
          <ul className="t-cap flex gap-3 text-tx2">
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-blue" />abaixo</li>
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-err" />acima</li>
          </ul>
        </div>
        {hasAny ? (
          <div className="h-56" role="img" aria-label="Calorias consumidas por dia contra o GET">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--c-bd)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} />
                <YAxis tickLine={false} axisLine={false} domain={[0, yTop]} ticks={Array.from({ length: yTop / 1000 + 1 }, (_, i) => i * 1000)} tick={TICK} width={40} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip cursor={{ fill: "var(--c-sup)" }} content={<Tip />} />
                <ReferenceLine y={d.get} stroke="var(--c-tx)" strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: `GET ${fmt(d.get)}`, position: "insideTopRight", fill: "var(--c-tx)", fontSize: 11, fontWeight: 600, dy: -12 }} />
                <Bar dataKey="kcal" radius={[6, 6, 0, 0]} maxBarSize={22}>
                  {data.map((p) => (
                    <Cell key={p.date} fill={p.consumed !== null && p.consumed > p.get ? "var(--c-err)" : "var(--c-blue)"} fillOpacity={p.isToday ? 0.45 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="t-small py-6 text-center text-tx2">Marque as refeições em Hoje para ver o gráfico da semana.</p>
        )}
      </Card>

      <Group>
        {week.points.map((p, i) => {
          const b = p.consumed === null ? null : p.get - p.consumed;
          return (
            <div key={p.date} className="flex items-center justify-between px-4 py-3">
              <span className={p.isToday ? "t-body-sb" : "t-body"}>
                {DAYS_FULL[i]}
                {p.isToday ? " · hoje" : ""}
              </span>
              <span className="flex items-center gap-3.5">
                <span className="t-small tnum text-tx2">{p.consumed === null ? "—" : `${fmt(p.consumed)}${p.isToday ? " até agora" : ""}`}</span>
                <span className={`t-small-sb tnum w-16 text-right ${b === null ? "text-tx2" : p.isToday ? "text-tx2" : b >= 0 ? "text-ok" : "text-err"}`}>
                  {b === null ? "—" : `${b >= 0 ? "−" : "+"}${fmt(Math.abs(b))}`}
                </span>
              </span>
            </div>
          );
        })}
      </Group>
      <p className="t-cap px-1 text-tx2">Referência: 7.700 kcal ≈ 1 kg de gordura. O saldo de cada dia é o GET menos o que você marcou como comido.</p>
    </Page>
  );
}
