"use client";

import { motion } from "framer-motion";
import { fmt } from "@/lib/calc";
import type { Macros } from "@/lib/types";

const MACROS: { key: keyof Macros; label: string }[] = [
  { key: "protein", label: "Proteína" },
  { key: "carbs", label: "Carbo" },
  { key: "fat", label: "Gordura" },
  { key: "fiber", label: "Fibra" },
];

/**
 * Cor só carrega significado: cinza = em andamento, neon = meta do plano
 * atingida. (Verde nunca é "identidade" de um macro — evita confundir com status.)
 */
function MacroMeter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const hit = pct >= 99;
  return (
    <div>
      <p className="font-mono text-[10px] tracking-wider text-dim uppercase">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">
        {fmt(value)}
        <span className="text-[11px] font-normal text-dim"> / {fmt(max)}g</span>
      </p>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemax={Math.round(max)}
      >
        <motion.div
          className={`h-full rounded-full ${hit ? "bg-neon" : "bg-text/80"}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 26 }}
        />
      </div>
    </div>
  );
}

export function EnergyPanel({
  consumed,
  planned,
  bmr,
  get,
}: {
  consumed: Macros;
  planned: Macros;
  bmr: number;
  get: number;
}) {
  const balanceNow = get - consumed.kcal; // >0 = déficit até agora
  const projected = get - planned.kcal; // déficit se cumprir o plano inteiro
  const over = consumed.kcal > get;
  const projectedOver = projected < 0;
  const pctOfGet = Math.min(100, (consumed.kcal / get) * 100);
  const pctPlan = Math.min(100, (planned.kcal / get) * 100);

  return (
    <section
      className={`rounded-2xl border bg-surface p-4 ${
        over ? "border-alert/50 glow-alert" : "border-line"
      }`}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-dim uppercase">Comido hoje</p>
          <p className="font-mono text-4xl leading-none font-semibold tracking-tight">
            {fmt(consumed.kcal)}
            <span className="ml-1 text-sm font-normal text-dim">
              / {fmt(planned.kcal)} kcal
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] tracking-widest text-dim uppercase">
            {projectedOver ? "Superávit previsto" : "Déficit previsto"}
          </p>
          <p
            className={`font-mono text-2xl leading-none font-semibold ${
              projectedOver ? "text-alert" : "text-neon"
            }`}
          >
            {projectedOver ? "+" : "−"}
            {fmt(Math.abs(projected))}
          </p>
        </div>
      </div>

      {/* consumido vs GET, com marcador do total do plano */}
      <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-raised">
        <motion.div
          className={`h-full rounded-full ${over ? "bg-alert" : "bg-neon"}`}
          initial={false}
          animate={{ width: `${pctOfGet}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 26 }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-text/70"
          style={{ left: `${pctPlan}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-dim">
        <span>TMB {fmt(bmr)}</span>
        <span>GET {fmt(get)}</span>
      </div>

      <p className="mt-2 rounded-xl bg-raised px-3 py-2 text-xs text-dim">
        Saldo até agora:{" "}
        <span
          className={`font-mono font-semibold ${over ? "text-alert" : "text-text"}`}
        >
          {over ? "+" : "−"}
          {fmt(Math.abs(balanceNow))} kcal
        </span>{" "}
        ({over ? "superávit" : "déficit"} — cai conforme você come).
      </p>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
        {MACROS.map(({ key, label }) => (
          <MacroMeter key={key} label={label} value={consumed[key]} max={planned[key]} />
        ))}
      </div>
    </section>
  );
}
