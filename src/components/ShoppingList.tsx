"use client";

import { useMemo } from "react";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  buildShoppingList,
  formatQty,
  toDateKey,
  weekStart,
  type FoodMap,
} from "@/lib/calc";
import { useStore } from "@/lib/store";
import type { MealPlan } from "@/lib/types";

export function ShoppingList({ plan, foods }: { plan: MealPlan; foods: FoodMap }) {
  const week = toDateKey(weekStart(new Date()));
  const checked = useStore((s) => s.shopping[week]);
  const toggle = useStore((s) => s.toggleShopping);
  const set = useMemo(() => new Set(checked ?? []), [checked]);
  const list = useMemo(() => buildShoppingList(plan, foods, 7), [plan, foods]);

  const total = CATEGORY_ORDER.reduce((a, c) => a + list[c].length, 0);
  const done = set.size;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] tracking-widest text-dim uppercase">
          Compras da semana · plano diário × 7
        </p>
        <p className="font-mono text-3xl font-semibold tabular-nums">
          {done}
          <span className="text-sm font-normal text-dim"> / {total} itens</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-neon transition-[width] duration-300"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {CATEGORY_ORDER.filter((c) => list[c].length > 0).map((c) => (
        <section key={c} className="rounded-2xl border border-line bg-surface">
          <h3 className="px-4 pt-3.5 pb-1 font-mono text-[11px] tracking-widest text-dim uppercase">
            {CATEGORY_LABEL[c]}
          </h3>
          <ul className="divide-y divide-line/70 px-1.5 pb-1.5">
            {list[c].map((l) => {
              const on = set.has(l.foodId);
              return (
                <li key={l.foodId}>
                  <button
                    onClick={() => toggle(week, l.foodId)}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left active:bg-raised"
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${
                        on ? "border-neon bg-neon text-bg" : "border-dim/60"
                      }`}
                    >
                      {on && (
                        <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                          <path
                            d="M3 8.5l3.2 3L13 4.5"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`flex-1 text-sm ${on ? "text-dim line-through" : ""}`}
                    >
                      {l.name}
                    </span>
                    <span
                      className={`font-mono text-sm tabular-nums ${on ? "text-dim" : "text-text"}`}
                    >
                      {formatQty(l.weekly, l.unit)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
