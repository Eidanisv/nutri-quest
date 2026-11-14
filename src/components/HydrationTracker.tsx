"use client";

import { motion } from "framer-motion";
import { fmt } from "@/lib/calc";
import { haptic } from "@/lib/haptics";

const STEP = 250; // ml por marcador → 20 marcadores para 5 L

export function HydrationTracker({
  ml,
  goalMl,
  onAdd,
  onSet,
}: {
  ml: number;
  goalMl: number;
  onAdd: (delta: number) => void;
  onSet: (ml: number) => void;
}) {
  const cells = Math.ceil(goalMl / STEP);
  const filled = Math.floor(ml / STEP);
  const hit = ml >= goalMl;

  return (
    <section
      className={`rounded-2xl border bg-surface p-4 ${hit ? "border-neon/40 glow-neon" : "border-line"}`}
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-dim uppercase">
            Hidratação
          </p>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {fmt(ml / 1000, 2)}
            <span className="text-sm font-normal text-dim">
              {" "}
              / {fmt(goalMl / 1000, 1)} L
            </span>
          </p>
        </div>
        <p className={`font-mono text-sm ${hit ? "text-neon" : "text-dim"}`}>
          {hit ? "meta batida" : `faltam ${fmt((goalMl - ml) / 1000, 2)} L`}
        </p>
      </div>

      {/* tocar num marcador define o total até ele; tocar no último ativo desfaz */}
      <div className="mt-3 grid grid-cols-10 gap-1.5">
        {Array.from({ length: cells }, (_, i) => {
          const on = i < filled;
          return (
            <button
              key={i}
              aria-label={`${(i + 1) * STEP} ml`}
              onClick={() => {
                haptic(8);
                onSet(on && i === filled - 1 ? i * STEP : (i + 1) * STEP);
              }}
              className="relative h-9 overflow-hidden rounded-md border border-line bg-raised"
            >
              <motion.span
                className={`absolute inset-x-0 bottom-0 ${hit ? "bg-neon" : "bg-cyan"}`}
                initial={false}
                animate={{ height: on ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            haptic(6);
            onAdd(-STEP);
          }}
          className="rounded-xl border border-line py-3 font-mono text-sm text-dim active:bg-raised"
        >
          −250
        </button>
        <button
          onClick={() => {
            haptic(10);
            onAdd(STEP);
          }}
          className="rounded-xl border border-cyan/50 py-3 font-mono text-sm font-semibold text-cyan active:bg-cyan/10"
        >
          +250 ml
        </button>
        <button
          onClick={() => {
            haptic(14);
            onAdd(500);
          }}
          className="rounded-xl bg-cyan py-3 font-mono text-sm font-bold text-bg active:opacity-80"
        >
          +500 ml
        </button>
      </div>
    </section>
  );
}
