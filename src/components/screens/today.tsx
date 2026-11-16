"use client";

import { useState } from "react";
import { fmt, formatQty, macrosOf } from "@/lib/calc";
import { dateLabel, useDay, useOnline } from "@/lib/derived";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { useSync } from "@/lib/sync";
import type { Meal } from "@/lib/types";
import {
  Avatar,
  Banner,
  Button,
  Card,
  Check,
  Chip,
  Icon,
  LargeTitle,
  NavBar,
  NumField,
  Page,
  Progress,
  Ring,
  SectionLabel,
  Sheet,
} from "../kit";

/** Linha de alimento com caixa redonda, no padrão do app todo. */
export function FoodRow({
  name,
  meta,
  note,
  kcal,
  on,
  skipped = false,
  onToggle,
  onSkip,
}: {
  name: string;
  meta: string;
  note?: string;
  kcal: number;
  on: boolean;
  skipped?: boolean;
  onToggle: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-stretch">
      <button onClick={onToggle} aria-pressed={on} aria-label={`${name}: comi`} className="flex min-w-0 flex-1 items-center gap-3.5 py-3 pr-2 pl-4 text-left active:bg-sup">
        <Check on={on} />
        <span className="min-w-0 flex-1">
          <span className={`t-body block ${on || skipped ? "text-tx2" : ""} ${skipped ? "line-through" : ""}`}>{name}</span>
          <span className="t-small block text-tx2">{skipped ? "Não comi" : meta}</span>
          {note && !skipped && <span className="t-cap mt-0.5 block text-link">↔ {note}</span>}
        </span>
        <span className={`t-small tnum text-tx2 ${skipped ? "line-through" : ""}`}>{fmt(kcal)}</span>
      </button>
      {onSkip && (
        <button
          onClick={onSkip}
          aria-pressed={skipped}
          aria-label={`${name}: não comi`}
          className="grid w-12 shrink-0 place-items-center active:bg-sup"
        >
          <span className={`grid size-[26px] place-items-center rounded-full border-2 ${skipped ? "border-err bg-err text-white" : "border-bd text-tx2"}`}>
            <Icon name="x" size={14} sw={3} />
          </span>
        </button>
      )}
    </div>
  );
}

const itemMeta = (qty: string, m: { protein: number; carbs: number; fat: number }) =>
  `${qty} · P ${fmt(m.protein)} g · C ${fmt(m.carbs)} g · G ${fmt(m.fat)} g`;

function MealCard({ meal, isNext }: { meal: Meal; isNext: boolean }) {
  const d = useDay();
  const toggle = useStore((s) => s.toggleItem);
  const skip = useStore((s) => s.toggleSkipped);
  const push = useNav((s) => s.push);
  const rows = meal.items.map((it) => ({ it, food: d.foods[it.foodId], m: macrosOf(d.foods[it.foodId], it.quantity) })).filter((r) => r.food);
  const planned = rows.reduce((a, r) => a + r.m.kcal, 0);
  const eaten = rows.filter((r) => d.checked.has(r.it.id));
  const eatenKcal = eaten.reduce((a, r) => a + r.m.kcal, 0);
  const skippedN = rows.filter((r) => d.skipped.has(r.it.id) && !d.checked.has(r.it.id)).length;
  const pending = rows.length - eaten.length - skippedN;
  const done = rows.length > 0 && pending === 0;
  // Refeição já completa ao abrir começa recolhida: o caminho comum (marcar o que falta) fica no topo.
  const [open, setOpen] = useState(!done);

  return (
    <section className="overflow-hidden rounded-xl bg-bg">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-sup">
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="t-body-sb">{meal.name}</span>
            {isNext && <Chip>Próxima</Chip>}
          </span>
          <span className={`t-small block ${done ? "text-ok" : "text-tx2"}`}>
            {meal.time} · {rows.length === 0 ? "sem itens" : done ? (skippedN > 0 ? `completa · ${skippedN} não comi` : "completa") : `faltam ${pending} de ${rows.length}`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="t-small tnum text-tx2">
            {fmt(eatenKcal)} / {fmt(planned)} kcal
          </span>
          {done ? (
            <span className="grid size-[22px] place-items-center rounded-full bg-ok text-white">
              <Icon name="check" size={13} sw={3} />
            </span>
          ) : (
            <Icon name={open ? "cu" : "cd"} size={18} sw={2} className="text-tx2" />
          )}
        </span>
      </button>
      {open && (
        <div>
          {rows.map(({ it, food, m }) => (
            <div key={it.id} className="border-t border-bd">
              <FoodRow
                name={food.name}
                meta={itemMeta(formatQty(it.quantity, food.unit), m)}
                note={it.note}
                kcal={m.kcal}
                on={d.checked.has(it.id)}
                skipped={d.skipped.has(it.id)}
                onToggle={() => {
                  haptic(d.checked.has(it.id) ? 6 : 12);
                  toggle(d.todayKey, it.id);
                }}
                onSkip={() => {
                  haptic(8);
                  skip(d.todayKey, it.id);
                }}
              />
            </div>
          ))}
          <button onClick={() => push({ id: "meal", mealId: meal.id })} className="t-small flex w-full items-center justify-between border-t border-bd px-4 py-3 text-link active:bg-sup">
            Ver detalhes da refeição
            <Icon name="cr" size={16} sw={2} />
          </button>
        </div>
      )}
    </section>
  );
}

export function TodayScreen() {
  const d = useDay();
  const online = useOnline();
  const status = useSync((s) => s.status);
  const addWater = useStore((s) => s.addWater);
  const setMealChecked = useStore((s) => s.setMealChecked);
  const skipMeal = useStore((s) => s.skipMeal);
  const { setTab, push, openSheet } = useNav();

  const ml = d.log?.waterMl ?? 0;
  const goal = d.user.waterGoalMl;
  const projected = d.get - d.planned.kcal;
  const emptyDiet = d.plan.meals.length === 0;
  const remainingItems = d.nextMeal?.items.filter((i) => !d.resolved.has(i.id) && d.foods[i.foodId]) ?? [];
  const nextKcal = d.nextMeal ? d.nextMeal.items.reduce((a, i) => (d.foods[i.foodId] ? a + macrosOf(d.foods[i.foodId], i.quantity).kcal : a), 0) : 0;
  const completeMeals = d.plan.meals.filter((m) => m.items.length > 0 && m.items.every((i) => d.resolved.has(i.id))).length;

  const macros = [
    { n: "Proteína", v: d.consumed.protein, m: d.planned.protein },
    { n: "Carboidrato", v: d.consumed.carbs, m: d.planned.carbs },
    { n: "Gordura", v: d.consumed.fat, m: d.planned.fat },
    { n: "Fibra", v: d.consumed.fiber, m: d.planned.fiber },
  ];

  return (
    <Page>
      <LargeTitle title="Hoje" sub={dateLabel(d.today)} right={<Avatar name={d.user.name} onClick={() => setTab("profile")} />} />

      {!online && status !== "unconfigured" && status !== "signed-out" && (
        <Banner tone="warn" icon="wifi">
          Sem conexão. Suas marcações ficam salvas e sincronizam quando a internet voltar.
        </Banner>
      )}

      {emptyDiet ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid size-[88px] place-items-center rounded-full bg-blue/10 text-blue">
            <Icon name="coffee" size={40} sw={1.6} />
          </span>
          <h2 className="t-t28">Sua dieta ainda está vazia</h2>
          <p className="t-body text-tx2">Monte as refeições e os alimentos para acompanhar calorias e macros.</p>
          <div className="mt-2 grid w-full gap-1">
            <Button onClick={() => push({ id: "diet" })}>Montar minha dieta</Button>
            <Button variant="link" disabled title="Em breve">
              Importar PDF do nutricionista · em breve
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="grid gap-4 p-5">
            <div className="flex items-center gap-5">
              <Ring value={d.planned.kcal ? d.consumed.kcal / d.planned.kcal : 0}>
                <div>
                  <p className="t-t28 tnum">{fmt(Math.max(0, d.planned.kcal - d.consumed.kcal))}</p>
                  <p className="t-cap text-tx2">kcal restantes</p>
                </div>
              </Ring>
              <div className="grid min-w-0 flex-1 gap-2.5">
                {macros.map((x) => (
                  <div key={x.n}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="t-cap text-tx2">{x.n}</span>
                      <span className="t-cap-sb tnum">
                        {fmt(x.v)} / {fmt(x.m)} g
                      </span>
                    </div>
                    <Progress value={x.m ? x.v / x.m : 0} h={4} label={x.n} />
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-bd" />
            <div className="flex items-end justify-between">
              <div>
                <p className="t-cap text-tx2">Comido hoje</p>
                <p className="t-body-sb tnum">
                  {fmt(d.consumed.kcal)} de {fmt(d.planned.kcal)} kcal
                </p>
              </div>
              <div className="text-right">
                <p className="t-cap text-tx2">{projected >= 0 ? "Déficit previsto" : "Superávit previsto"}</p>
                <p className={`t-body-sb tnum ${projected >= 0 ? "text-ok" : "text-err"}`}>
                  {projected >= 0 ? "−" : "+"}
                  {fmt(Math.abs(projected))} kcal
                </p>
              </div>
            </div>
          </Card>

          {d.nextMeal ? (
            <Card className="grid gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="t-cap-sb tracking-wide text-link uppercase">Próxima · {d.nextMeal.time}</p>
                  <h2 className="t-t21">{d.nextMeal.name}</h2>
                </div>
                <span className="t-small tnum text-tx2">{fmt(nextKcal)} kcal</span>
              </div>
              <p className="t-small text-tx2">
                Falta {remainingItems.slice(0, 2).map((i) => d.foods[i.foodId].name).join(" e ")}
                {remainingItems.length > 2 ? ` e mais ${remainingItems.length - 2}` : ""}.
              </p>
              <Button
                size="md"
                onClick={() => {
                  haptic(14);
                  setMealChecked(d.todayKey, d.nextMeal!.id, true);
                }}
              >
                {remainingItems.length === d.nextMeal.items.length ? "Marcar tudo como comido" : "Marcar o que falta como comido"}
              </Button>
              <Button
                size="md"
                variant="outline"
                onClick={() => {
                  haptic(8);
                  skipMeal(d.todayKey, d.nextMeal!.id);
                }}
              >
                {remainingItems.length === d.nextMeal.items.length ? "Não comi esta refeição" : "Não comi o que falta"}
              </Button>
            </Card>
          ) : (
            <Card className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-ok text-white">
                <Icon name="check" size={20} sw={3} />
              </span>
              <div>
                <p className="t-body-sb">Plano de hoje completo</p>
                <p className="t-small text-tx2">Todas as refeições foram marcadas.</p>
              </div>
            </Card>
          )}
        </>
      )}

      <Card className="grid gap-3">
        <button onClick={() => openSheet("water")} className="flex items-end justify-between text-left" aria-label="Abrir registro de água">
          <div>
            <p className="t-cap-sb tracking-wide text-tx2 uppercase">Água</p>
            <p className="t-t28 tnum">
              {fmt(ml / 1000, 2)} <span className="t-body font-normal text-tx2">de {fmt(goal / 1000, 1)} L</span>
            </p>
          </div>
          <span className={`t-small ${ml >= goal ? "text-ok" : "text-tx2"}`}>{ml >= goal ? "Meta batida" : `faltam ${fmt((goal - ml) / 1000, 2)} L`}</span>
        </button>
        <Progress value={ml / goal} tone={ml >= goal ? "ok" : "blue"} h={8} label="Água" />
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="md" className="!px-2" disabled={ml <= 0} onClick={() => { haptic(6); addWater(d.todayKey, -250); }}>
            −250
          </Button>
          <Button variant="outline" size="md" className="!px-2" onClick={() => { haptic(10); addWater(d.todayKey, 250); }}>
            +250 ml
          </Button>
          <Button size="md" className="!px-2" onClick={() => { haptic(14); addWater(d.todayKey, 500); }}>
            +500 ml
          </Button>
        </div>
      </Card>

      {!emptyDiet && (
        <>
          <SectionLabel right={`${completeMeals} de ${d.plan.meals.length} completas`}>Refeições</SectionLabel>
          {d.plan.meals.map((m) => (
            <MealCard key={m.id} meal={m} isNext={m.id === d.nextMeal?.id} />
          ))}
        </>
      )}
    </Page>
  );
}

// ───────────── Detalhe da refeição ─────────────

export function MealDetailScreen({ mealId }: { mealId: string }) {
  const d = useDay();
  const pop = useNav((s) => s.pop);
  const push = useNav((s) => s.push);
  const toggle = useStore((s) => s.toggleItem);
  const skip = useStore((s) => s.toggleSkipped);
  const skipMeal = useStore((s) => s.skipMeal);
  const setMealChecked = useStore((s) => s.setMealChecked);
  const meal = d.plan.meals.find((m) => m.id === mealId);
  if (!meal) return null;

  const rows = meal.items.map((it) => ({ it, food: d.foods[it.foodId], m: macrosOf(d.foods[it.foodId], it.quantity) })).filter((r) => r.food);
  const tot = rows.reduce((a, r) => ({ kcal: a.kcal + r.m.kcal, p: a.p + r.m.protein, c: a.c + r.m.carbs, g: a.g + r.m.fat }), { kcal: 0, p: 0, c: 0, g: 0 });
  const left = rows.filter((r) => !d.resolved.has(r.it.id)).length;
  const skippedN = rows.filter((r) => d.skipped.has(r.it.id) && !d.checked.has(r.it.id)).length;
  const notes = rows.filter((r) => r.it.note);

  return (
    <Page tabbar={false}>
      <NavBar back="Hoje" onBack={pop} right={<button onClick={() => push({ id: "meal-edit", mealId })} className="t-body text-link">Editar</button>} />
      <div>
        <h1 className="t-t28">{meal.name}</h1>
        <p className="t-body text-tx2">
          {meal.time} · {left === 0 ? (skippedN > 0 ? `completa · ${skippedN} não comi` : "completa") : `faltam ${left} de ${rows.length} itens`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[`${fmt(tot.kcal)} kcal`, `P ${fmt(tot.p)} g`, `C ${fmt(tot.c)} g`, `G ${fmt(tot.g)} g`].map((x) => (
          <Chip key={x} tone="white">{x}</Chip>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl bg-bg">
        {rows.map(({ it, food, m }, i) => (
          <div key={it.id} className={i ? "border-t border-bd" : ""}>
            <FoodRow name={food.name} meta={itemMeta(formatQty(it.quantity, food.unit), m)} kcal={m.kcal} on={d.checked.has(it.id)} skipped={d.skipped.has(it.id)} onToggle={() => { haptic(10); toggle(d.todayKey, it.id); }} onSkip={() => { haptic(8); skip(d.todayKey, it.id); }} />
          </div>
        ))}
        {rows.length === 0 && <p className="t-small p-4 text-center text-tx2">Esta refeição ainda não tem alimentos.</p>}
      </div>
      {notes.length > 0 && (
        <Banner>
          <p className="t-small-sb">Substituições do plano</p>
          {notes.map((r) => (
            <p key={r.it.id} className="t-small">
              {r.food.name}: {r.it.note}
            </p>
          ))}
        </Banner>
      )}
      <div className="grid gap-1 pt-2">
        {left > 0 ? (
          <>
            <Button onClick={() => { haptic(14); setMealChecked(d.todayKey, mealId, true); }}>{left === rows.length ? "Marcar refeição completa" : "Marcar o que falta como comido"}</Button>
            <Button variant="outline" onClick={() => { haptic(8); skipMeal(d.todayKey, mealId); }}>{left === rows.length ? "Não comi esta refeição" : "Não comi o que falta"}</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setMealChecked(d.todayKey, mealId, false)}>Desmarcar a refeição</Button>
        )}
        <Button variant="link" onClick={() => push({ id: "meal-edit", mealId })}>Editar refeição</Button>
      </div>
    </Page>
  );
}

// ───────────── Registrar água (folha) ─────────────

export function WaterSheet() {
  const sheet = useNav((s) => s.sheet);
  const openSheet = useNav((s) => s.openSheet);
  const d = useDay();
  const addWater = useStore((s) => s.addWater);
  const [chosen, setChosen] = useState(250);
  const [custom, setCustom] = useState<number | null>(null);
  const [undo, setUndo] = useState<number[]>([]);
  const ml = d.log?.waterMl ?? 0;
  const goal = d.user.waterGoalMl;
  const amount = custom ?? chosen;
  const close = () => {
    setUndo([]);
    setCustom(null);
    openSheet(null);
  };

  return (
    <Sheet open={sheet === "water"} title="Registrar água" onClose={close}>
      <div className="grid gap-4">
        <div className="text-center">
          <p className="t-t40 tnum">{fmt(ml / 1000, 2)} L</p>
          <p className="t-body text-tx2">
            de {fmt(goal / 1000, 1)} L · {ml >= goal ? "meta batida" : `faltam ${fmt((goal - ml) / 1000, 2)} L`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Quantidade">
          {[150, 250, 350, 500].map((v) => {
            const on = custom === null && chosen === v;
            return (
              <button key={v} role="radio" aria-checked={on} onClick={() => { setCustom(null); setChosen(v); }} className={`flex items-center justify-center gap-2 rounded-xl py-4 t-body-sb ${on ? "bg-blue text-white" : "bg-sup"}`}>
                <Icon name="drop" size={20} sw={2} className={on ? "" : "text-blue"} />
                {v} ml
              </button>
            );
          })}
        </div>
        <NumField label="Outra quantidade (ml)" value={custom ?? undefined} onCommit={(n) => setCustom(n)} allowEmpty min={1} max={3000} decimals={0} placeholder="Digite o valor" unit="ml" />
        <div className="grid gap-1">
          <Button onClick={() => { haptic(12); addWater(d.todayKey, amount); setUndo((u) => [...u, amount]); setCustom(null); }}>Adicionar {amount} ml</Button>
          <Button variant="link" disabled={!undo.length} onClick={() => { const last = undo[undo.length - 1]; addWater(d.todayKey, -last); setUndo((u) => u.slice(0, -1)); }}>
            Desfazer último registro
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
