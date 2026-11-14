"use client";

import { useMemo, useState } from "react";
import { calcGet, fmt, formatQty, macrosOf, planTotals, type FoodMap } from "@/lib/calc";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";
import { FoodPicker } from "./Foods";
import { Card, NumInput, btnGhost, btnPrimary, inputCls } from "./ui";

function MealEditor({ meal, foods }: { meal: Meal; foods: FoodMap }) {
  const updateMeal = useStore((s) => s.updateMeal);
  const deleteMeal = useStore((s) => s.deleteMeal);
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const [picking, setPicking] = useState(false);

  const kcal = meal.items.reduce((a, i) => a + macrosOf(foods[i.foodId], i.quantity).kcal, 0);

  return (
    <Card className="grid gap-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <input
            value={meal.name}
            onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
            aria-label="Nome da refeição"
            className={`${inputCls} font-semibold`}
          />
        </div>
        <div className="w-28 shrink-0">
          <input
            type="time"
            value={meal.time}
            onChange={(e) => e.target.value && updateMeal(meal.id, { time: e.target.value })}
            aria-label="Horário"
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>

      <ul className="grid gap-2.5">
        {meal.items.map((it) => {
          const f = foods[it.foodId];
          const m = macrosOf(f, it.quantity);
          return (
            <li key={it.id} className="rounded-xl border border-line/80 bg-raised/50 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm">{f.name}</p>
                <button
                  onClick={() => deleteItem(meal.id, it.id)}
                  aria-label={`Remover ${f.name}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-dim active:bg-raised"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="w-28 shrink-0">
                  <NumInput
                    value={it.quantity}
                    onCommit={(n) => n && updateItem(meal.id, it.id, { quantity: n })}
                    min={0.1}
                    max={5000}
                    decimals={1}
                    unit={f.unit}
                    ariaLabel={`Quantidade de ${f.name}`}
                  />
                </div>
                <p className="font-mono text-[11px] text-dim">
                  {formatQty(it.quantity, f.unit)} · {fmt(m.kcal)} kcal · P {fmt(m.protein)}g
                </p>
              </div>
              <input
                value={it.note ?? ""}
                onChange={(e) => updateItem(meal.id, it.id, { note: e.target.value || undefined })}
                placeholder="Substituição (opcional)"
                aria-label={`Substituição para ${f.name}`}
                className={`${inputCls} mt-2 py-2 text-xs`}
              />
            </li>
          );
        })}
      </ul>

      <button onClick={() => setPicking(true)} className={btnGhost}>
        + Adicionar alimento
      </button>

      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-dim">{fmt(kcal)} kcal nesta refeição</p>
        <button
          onClick={() => {
            if (window.confirm(`Excluir "${meal.name}" e seus ${meal.items.length} itens?`))
              deleteMeal(meal.id);
          }}
          className="font-mono text-xs text-alert underline underline-offset-2"
        >
          excluir refeição
        </button>
      </div>

      <FoodPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(f) => {
          addItem(meal.id, f.id, f.unit === "un" ? 1 : 100);
          setPicking(false);
        }}
      />
    </Card>
  );
}

export function DietEditor() {
  const plan = useStore((s) => s.plan);
  const foodsArr = useStore((s) => s.foods);
  const user = useStore((s) => s.user);
  const addMeal = useStore((s) => s.addMeal);

  const foods: FoodMap = useMemo(() => Object.fromEntries(foodsArr.map((f) => [f.id, f])), [foodsArr]);
  const totals = useMemo(() => planTotals(plan, foods), [plan, foods]);
  const get = calcGet(user);
  const balance = get - totals.kcal;

  return (
    <div className="grid gap-4">
      <Card>
        <p className="font-mono text-[11px] tracking-widest text-dim uppercase">Total da dieta</p>
        <p className="font-mono text-3xl font-semibold">
          {fmt(totals.kcal)} <span className="text-sm font-normal text-dim">kcal/dia</span>
        </p>
        <p className="mt-1 font-mono text-xs text-dim">
          P {fmt(totals.protein)}g · C {fmt(totals.carbs)}g · G {fmt(totals.fat)}g · Fibra{" "}
          {fmt(totals.fiber)}g
        </p>
        <p className="mt-2 text-xs text-dim">
          Seu GET estimado é {fmt(get)} kcal →{" "}
          <span className={balance >= 0 ? "text-neon" : "text-alert"}>
            {balance >= 0 ? "déficit" : "superávit"} de {fmt(Math.abs(balance))} kcal/dia
          </span>
          . As mudanças valem na hora, e o dia de hoje é recalculado.
        </p>
      </Card>

      {plan.meals.map((m) => (
        <MealEditor key={m.id} meal={m} foods={foods} />
      ))}

      {plan.meals.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-dim">
          Nenhuma refeição ainda. Crie a primeira e adicione os alimentos.
        </p>
      )}

      <button onClick={() => addMeal("Nova refeição", "12:00")} className={btnPrimary}>
        + Nova refeição
      </button>
    </div>
  );
}
