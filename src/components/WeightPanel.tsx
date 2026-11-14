"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calibrate, fmt, weightSeries } from "@/lib/calc";
import type { DailyLog, User } from "@/lib/types";

const TICK = {
  fill: "#8d8d9b",
  fontSize: 11,
  fontFamily: 'ui-monospace, Menlo, Consolas, "Courier New", monospace',
};

const shortDate = (key: string) => {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
};

export function WeightPanel({
  user,
  logs,
  bmr,
  todayKey,
  today,
  onSave,
  onApplyFactor,
}: {
  user: User;
  logs: Record<string, DailyLog>;
  bmr: number;
  todayKey: string;
  today: Date;
  onSave: (kg: number | null) => void;
  onApplyFactor: (factor: number) => void;
}) {
  const series = useMemo(() => weightSeries(logs), [logs]);
  const cal = useMemo(() => calibrate(logs, bmr, today), [logs, bmr, today]);
  const todayKg = logs[todayKey]?.weightKg;

  const [text, setText] = useState(todayKg !== undefined ? String(todayKg).replace(".", ",") : "");
  useEffect(() => {
    setText(todayKg !== undefined ? String(todayKg).replace(".", ",") : "");
  }, [todayKg]);

  const parsed = Number(text.replace(",", "."));
  const valid = Number.isFinite(parsed) && parsed >= 30 && parsed <= 300;

  const last = series.at(-1);
  const prev = series.length > 1 ? series.at(-2) : undefined;
  const delta = last && prev ? last.kg - prev.kg : null;
  const weekAgo = series.find((p) => p.date >= shiftKey(todayKey, -7));
  const delta7 = last && weekAgo && weekAgo.date !== last.date ? last.kg - weekAgo.kg : null;

  const recent = [...series].reverse().slice(0, 7);
  const lows = series.map((p) => p.kg);
  const yMin = lows.length ? Math.floor(Math.min(...lows) - 1) : 90;
  const yMax = lows.length ? Math.ceil(Math.max(...lows) + 1) : 100;

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] tracking-widest text-dim uppercase">
          Pesagem de hoje · em jejum
        </p>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <input
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={fmt(user.weightKg, 1)}
              aria-label="Peso em kg"
              className="w-full rounded-xl border border-line bg-raised py-3 pr-10 pl-4 font-mono text-2xl font-semibold tabular-nums outline-none focus:border-neon"
            />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 font-mono text-sm text-dim">
              kg
            </span>
          </div>
          <button
            disabled={!valid}
            onClick={() => onSave(Math.round(parsed * 10) / 10)}
            className="rounded-xl bg-neon px-5 font-mono text-sm font-bold text-bg disabled:opacity-30 active:opacity-80"
          >
            Salvar
          </button>
        </div>
        {todayKg !== undefined && (
          <button
            onClick={() => onSave(null)}
            className="mt-2 font-mono text-[11px] text-dim underline underline-offset-2"
          >
            remover pesagem de hoje
          </button>
        )}
        {text !== "" && !valid && (
          <p className="mt-2 text-xs text-alert">Digite um peso entre 30 e 300 kg.</p>
        )}
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Atual" value={last ? `${fmt(last.kg, 1)} kg` : "—"} />
        <Stat
          label="vs. anterior"
          value={delta === null ? "—" : signed(delta)}
          tone={delta === null ? undefined : delta <= 0 ? "good" : "bad"}
        />
        <Stat
          label="em 7 dias"
          value={delta7 === null ? "—" : signed(delta7)}
          tone={delta7 === null ? undefined : delta7 <= 0 ? "good" : "bad"}
        />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 pb-2">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-mono text-[11px] tracking-widest text-dim uppercase">Peso</p>
          <ul className="flex gap-x-3 text-[11px] text-dim">
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-dim" /> pesagem
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-text" /> média 7 dias
            </li>
          </ul>
        </div>
        {series.length < 2 ? (
          <p className="pb-3 text-sm text-dim">
            O gráfico aparece a partir da 2ª pesagem. Pese-se de manhã, em jejum, 2 a 3 vezes por
            semana.
          </p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series.map((p) => ({ ...p, label: shortDate(p.date) }))}
                margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
              >
                <CartesianGrid stroke="#25252d" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[yMin, yMax]}
                  allowDecimals={false}
                  tick={TICK}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: "#8d8d9b", strokeOpacity: 0.5 }}
                  content={<WeightTip />}
                />
                <Line
                  dataKey="avg7"
                  stroke="#ececf1"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="kg"
                  stroke="none"
                  dot={{ r: 4, fill: "#8d8d9b", stroke: "#101013", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#ececf1", stroke: "#101013", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section
        className={`rounded-2xl border bg-surface p-4 ${cal.ok ? "border-neon/40 glow-neon" : "border-line"}`}
      >
        <p className="font-mono text-[11px] tracking-widest text-dim uppercase">
          Calibração do GET
        </p>
        <p className="mt-1 text-xs text-dim">
          Compara o que você comeu com o que o peso fez e estima seu gasto real.
        </p>

        {cal.ok ? (
          <div className="mt-3">
            <div className="flex items-end justify-between">
              <p className="font-mono text-3xl font-semibold text-neon tabular-nums">
                {fmt(cal.observedGet)}
                <span className="ml-1 text-sm font-normal text-dim">kcal/dia</span>
              </p>
              <p className="font-mono text-sm text-dim">fator {fmt(cal.factor, 2)}</p>
            </div>
            <p className="mt-2 text-xs text-dim">
              Ingestão média {fmt(cal.avgIntake)} kcal ·{" "}
              {cal.slopeKgWeek <= 0 ? "perdendo" : "ganhando"}{" "}
              {fmt(Math.abs(cal.slopeKgWeek), 2)} kg/sem · {cal.weighIns} pesagens em {cal.days}{" "}
              dias. Hoje o app usa GET {fmt(bmr * user.activityFactor)} (fator{" "}
              {fmt(user.activityFactor, 2)}).
            </p>
            <button
              onClick={() => onApplyFactor(Math.round(cal.factor * 100) / 100)}
              className="mt-3 w-full rounded-xl border border-neon/50 py-3 font-mono text-sm font-semibold text-neon active:bg-neon/10"
            >
              Aplicar fator {fmt(cal.factor, 2)}
            </button>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-raised px-3 py-2.5 text-xs text-dim">{cal.reason}</p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-dim">
          Vale se você marcar tudo o que come. Exige ≥ 4 pesagens, ≥ 14 dias e 70% dos dias com
          refeição registrada.
        </p>
      </section>

      {recent.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface">
          <h3 className="px-4 pt-3.5 pb-1 font-mono text-[11px] tracking-widest text-dim uppercase">
            Últimas pesagens
          </h3>
          <ul className="divide-y divide-line/70 px-4 pb-2">
            {recent.map((p) => (
              <li key={p.date} className="flex justify-between py-2.5 font-mono text-sm tabular-nums">
                <span className="text-dim">{shortDate(p.date)}</span>
                <span>{fmt(p.kg, 1)} kg</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type WRow = { date: string; kg: number; avg7: number };

function WeightTip({ active, payload }: { active?: boolean; payload?: { payload: WRow }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-mono text-base font-semibold text-text">{fmt(p.kg, 1)} kg</p>
      <p className="text-dim">
        {shortDate(p.date)} · média 7 dias {fmt(p.avg7, 1)} kg
      </p>
    </div>
  );
}

function signed(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n), 1)} kg`;
}

function shiftKey(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const x = new Date(y, m - 1, d + days);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="font-mono text-[10px] tracking-widest text-dim uppercase">{label}</p>
      <p
        className={`font-mono text-lg font-semibold tabular-nums ${
          tone === "good" ? "text-neon" : tone === "bad" ? "text-alert" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
