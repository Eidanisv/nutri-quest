"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt, type WeekPoint } from "@/lib/calc";

const TICK = {
  fill: "#8d8d9b",
  fontSize: 11,
  fontFamily: 'ui-monospace, Menlo, Consolas, "Courier New", monospace',
};

const NEON = "#39ff88";
const ALERT = "#ff3b5c";

type Row = WeekPoint & { kcal: number };

/** "−957 déficit" / "+420 superávit": sinal + palavra, nunca só cor. */
function balanceText(get: number, consumed: number) {
  const b = get - consumed;
  return b >= 0 ? `−${fmt(b)} kcal (déficit)` : `+${fmt(-b)} kcal (superávit)`;
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-xs shadow-lg">
      {p.consumed === null ? (
        <p className="font-mono text-dim">{p.label} · sem registro</p>
      ) : (
        <>
          <p className="font-mono text-base font-semibold text-text">
            {fmt(p.consumed)} <span className="text-xs font-normal text-dim">kcal</span>
          </p>
          <p className="text-dim">
            {p.label} · GET {fmt(p.get)}
          </p>
          <p className="font-mono text-text">{balanceText(p.get, p.consumed)}</p>
        </>
      )}
    </div>
  );
}

export function WeekChart({
  points,
  get,
  closedBalance,
  todayBalance,
}: {
  points: WeekPoint[];
  get: number;
  closedBalance: number;
  todayBalance: number;
}) {
  const deficit = closedBalance >= 0;
  const yTop = Math.ceil((get * 1.15) / 1000) * 1000;
  const data: Row[] = points.map((p) => ({ ...p, kcal: p.consumed ?? 0 }));

  return (
    <div className="grid gap-4">
      <section
        className={`rounded-2xl border bg-surface p-4 ${deficit ? "border-neon/40 glow-neon" : "border-alert/50 glow-alert"}`}
      >
        <p className="font-mono text-[11px] tracking-widest text-dim uppercase">
          Saldo acumulado da semana
        </p>
        <p
          className={`font-mono text-4xl font-semibold ${deficit ? "text-neon" : "text-alert"}`}
        >
          {deficit ? "−" : "+"}
          {fmt(Math.abs(closedBalance))}
          <span className="ml-1 text-sm font-normal text-dim">
            kcal · {deficit ? "déficit" : "superávit"}
          </span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-dim">
          Soma dos dias fechados (até ontem).{" "}
          {todayBalance === 0 ? (
            "Hoje ainda sem refeições marcadas."
          ) : (
            <>
              Hoje, parcial:{" "}
              <span className="font-mono text-text">
                {todayBalance >= 0 ? "−" : "+"}
                {fmt(Math.abs(todayBalance))}
              </span>
              .
            </>
          )}{" "}
          Referência: 7.700 kcal ≈ 1 kg de gordura.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 pb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-mono text-[11px] tracking-widest text-dim uppercase">
            Consumido × GET
          </p>
          {/* legenda: sempre presente com ≥ 2 séries; chave espelha a marca */}
          <ul className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[11px] text-dim">
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: NEON }} /> abaixo do GET
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: ALERT }} /> acima
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-text/70" /> GET
            </li>
          </ul>
        </div>

        <div className="h-60" role="img" aria-label="Calorias consumidas por dia contra o GET">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#25252d" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, yTop]}
                ticks={Array.from({ length: yTop / 1000 + 1 }, (_, i) => i * 1000)}
                tick={TICK}
                width={44}
              />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<Tip />} />
              <ReferenceLine
                y={get}
                stroke="#ececf1"
                strokeOpacity={0.6}
                strokeWidth={1}
                label={{
                  value: `GET ${fmt(get)}`,
                  position: "insideTopRight",
                  fill: "#ececf1",
                  fontSize: 10,
                }}
              />
              <Bar dataKey="kcal" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {data.map((p) => (
                  <Cell
                    key={p.date}
                    fill={p.kcal > p.get ? ALERT : NEON}
                    fillOpacity={p.isToday ? 0.5 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* tabela: equivalente completo do gráfico (a tooltip nunca é o único caminho) */}
        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-[11px] tracking-wider text-dim uppercase">
            Ver como tabela
          </summary>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-dim">
                <th className="py-1 font-normal">Dia</th>
                <th className="py-1 text-right font-normal">Consumido</th>
                <th className="py-1 text-right font-normal">Saldo</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {data.map((p) => (
                <tr key={p.date} className="border-t border-line/70">
                  <td className="py-1.5">
                    {p.label}
                    {p.isToday ? " (hoje)" : ""}
                  </td>
                  <td className="py-1.5 text-right">
                    {p.consumed === null ? "—" : `${fmt(p.consumed)} kcal`}
                  </td>
                  <td className="py-1.5 text-right">
                    {p.consumed === null ? "—" : balanceText(p.get, p.consumed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </div>
  );
}
