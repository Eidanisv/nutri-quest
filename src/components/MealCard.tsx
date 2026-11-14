"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fmt, formatQty, macrosOf, type FoodMap } from "@/lib/calc";
import { haptic } from "@/lib/haptics";
import type { Meal } from "@/lib/types";

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
      <path
        d="M3 8.5l3.2 3L13 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`size-4 text-dim transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MealCard({
  meal,
  foods,
  checked,
  isNext,
  onToggle,
}: {
  meal: Meal;
  foods: FoodMap;
  checked: Set<string>;
  /** Primeira refeição ainda incompleta do dia. */
  isNext: boolean;
  onToggle: (itemId: string) => void;
}) {
  const rows = meal.items.map((it) => ({
    it,
    food: foods[it.foodId],
    m: macrosOf(foods[it.foodId], it.quantity),
  }));
  const planned = rows.reduce((a, r) => a + r.m.kcal, 0);
  const eaten = rows.filter((r) => checked.has(r.it.id));
  const eatenKcal = eaten.reduce((a, r) => a + r.m.kcal, 0);
  const done = eaten.length === rows.length;
  const remaining = rows.length - eaten.length;

  // Refeição já concluída ao abrir o app começa recolhida: o caminho comum
  // (marcar o que falta) fica no topo. Não recolhe sozinha ao marcar o último item.
  const [open, setOpen] = useState(!done);
  const panelId = `meal-${meal.id}`;

  return (
    <section
      className={`rounded-2xl border bg-surface transition-colors ${
        done ? "border-neon/40 glow-neon" : isNext ? "border-text/30" : "border-line"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 pt-3.5 pb-2.5 text-left active:bg-raised"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight">{meal.name}</span>
            {isNext && (
              <span className="rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-neon uppercase">
                próxima
              </span>
            )}
          </span>
          <span className="font-mono text-[11px] text-dim">
            {meal.time} · {done ? "completa ✓" : `faltam ${remaining} de ${rows.length}`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-right font-mono text-xs tabular-nums">
            <span className={done ? "text-neon" : "text-text"}>{fmt(eatenKcal)}</span>
            <span className="text-dim"> / {fmt(planned)} kcal</span>
          </span>
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <motion.ul
          id={panelId}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="divide-y divide-line/70 px-1.5 pb-1.5"
        >
          {rows.map(({ it, food, m }) => {
            const on = checked.has(it.id);
            return (
              <li key={it.id}>
                <motion.button
                  onClick={() => {
                    haptic(on ? 6 : 12);
                    onToggle(it.id);
                  }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left active:bg-raised"
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors ${
                      on ? "border-neon bg-neon text-bg" : "border-dim/70 text-transparent"
                    }`}
                  >
                    <CheckIcon />
                  </span>
                  <span className={`min-w-0 flex-1 transition-opacity ${on ? "opacity-45" : ""}`}>
                    <span className="block truncate text-sm">{food.name}</span>
                    <span className="font-mono text-[11px] text-dim">
                      {formatQty(it.quantity, food.unit)} · P {fmt(m.protein)}g · C {fmt(m.carbs)}g ·
                      G {fmt(m.fat)}g
                    </span>
                    {it.note && (
                      <span className="mt-0.5 block text-[11px] text-amber">↔ {it.note}</span>
                    )}
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums ${on ? "text-neon" : "text-dim"}`}
                  >
                    {fmt(m.kcal)}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </motion.ul>
      )}
    </section>
  );
}
