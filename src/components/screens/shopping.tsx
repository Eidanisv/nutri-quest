"use client";

import { useMemo } from "react";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  buildShoppingList,
  formatQty,
  toDateKey,
  weekRangeLabel,
  weekStart,
} from "@/lib/calc";
import { useDay } from "@/lib/derived";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Button, Card, Check, Group, LargeTitle, Page, Progress, SectionLabel } from "../kit";

export function ShoppingScreen() {
  const d = useDay();
  const push = useNav((s) => s.push);
  const week = toDateKey(weekStart(d.today));
  const checked = useStore((s) => s.shopping[week]);
  const toggle = useStore((s) => s.toggleShopping);
  const clear = useStore((s) => s.clearShopping);
  const set = useMemo(() => new Set(checked ?? []), [checked]);
  const list = useMemo(() => buildShoppingList(d.plan, d.foods, 7), [d.plan, d.foods]);
  const total = CATEGORY_ORDER.reduce((a, c) => a + list[c].length, 0);
  // só conta o que ainda existe na lista (alimento removido da dieta não pesa)
  const ids = new Set(CATEGORY_ORDER.flatMap((c) => list[c].map((l) => l.foodId)));
  const done = [...set].filter((i) => ids.has(i)).length;

  if (total === 0)
    return (
      <Page>
        <LargeTitle title="Compras" sub={`Semana de ${weekRangeLabel(d.today)}`} />
        <Card className="grid gap-3 px-6 py-10 text-center">
          <h2 className="t-t21">A lista vem da sua dieta</h2>
          <p className="t-body text-tx2">Adicione refeições e alimentos para ver aqui o que comprar na semana.</p>
          <Button variant="outline" size="md" onClick={() => push({ id: "diet" })}>
            Montar minha dieta
          </Button>
        </Card>
      </Page>
    );

  return (
    <Page>
      <LargeTitle title="Compras" sub={`Semana de ${weekRangeLabel(d.today)}`} />
      <Card className="grid gap-3">
        <div className="flex items-end justify-between">
          <p className="t-t28 tnum">
            {done} <span className="t-body font-normal text-tx2">de {total} itens</span>
          </p>
          <button disabled={done === 0} onClick={() => clear(week)} className="t-small text-link disabled:opacity-35">
            Limpar marcados
          </button>
        </div>
        <Progress value={total ? done / total : 0} h={8} label="Itens comprados" />
        <p className="t-cap text-tx2">Plano diário × 7 dias. As quantidades são em peso cozido: ao comprar cru, considere cerca de 30% a mais.</p>
      </Card>

      {CATEGORY_ORDER.filter((c) => list[c].length > 0).map((c) => {
        const n = list[c].filter((l) => set.has(l.foodId)).length;
        return (
          <div key={c} className="grid gap-1.5">
            <SectionLabel right={`${n}/${list[c].length}`}>{CATEGORY_LABEL[c]}</SectionLabel>
            <Group>
              {list[c].map((l) => {
                const on = set.has(l.foodId);
                return (
                  <button key={l.foodId} onClick={() => { haptic(8); toggle(week, l.foodId); }} aria-pressed={on} className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-sup">
                    <Check on={on} />
                    <span className={`t-body flex-1 ${on ? "text-tx2" : ""}`}>{l.name}</span>
                    <span className="t-small tnum text-tx2">{formatQty(l.weekly, l.unit)}</span>
                  </button>
                );
              })}
            </Group>
          </div>
        );
      })}
    </Page>
  );
}
