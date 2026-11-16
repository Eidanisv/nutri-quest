"use client";

import { useMemo, useState } from "react";
import { fmt, formatQty, macrosOf } from "@/lib/calc";
import { useDay } from "@/lib/derived";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { useStore } from "@/lib/store";
import type { FoodItem, Macros, PlanItem, Swap } from "@/lib/types";
import { Banner, Button, Group, NumField, Row, Segmented, Sheet, TextField } from "../kit";

type Mode = "catalog" | "text";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const unitLabel = (f: FoodItem) => (f.unit === "un" ? "un" : f.unit);

/** Macros do que foi comido, quando só se sabe as calorias: mesma proporção do item previsto. */
function scaled(base: Macros, kcal: number): Macros {
  const k = base.kcal > 0 ? kcal / base.kcal : 0;
  return {
    kcal,
    protein: Math.round(base.protein * k * 10) / 10,
    carbs: Math.round(base.carbs * k * 10) / 10,
    fat: Math.round(base.fat * k * 10) / 10,
    fiber: Math.round(base.fiber * k * 10) / 10,
  };
}

function SwapForm({ date, item, planned, onClose }: { date: string; item: PlanItem; planned: FoodItem; onClose: () => void }) {
  const foods = useStore((s) => s.foods);
  const current = useStore((s) => s.logs[date]?.swaps?.[item.id]);
  const setSwap = useStore((s) => s.setSwap);
  const plannedM = macrosOf(planned, item.quantity);

  const [mode, setMode] = useState<Mode>(current && !current.foodId ? "text" : "catalog");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<FoodItem | null>(current?.foodId ? (foods.find((f) => f.id === current.foodId) ?? null) : null);
  const [qty, setQty] = useState<number>(current?.quantity ?? 0);
  const [text, setText] = useState(current && !current.foodId ? current.name : "");
  const [kcal, setKcal] = useState<number>(current && !current.foodId ? current.macros.kcal : Math.round(plannedM.kcal));

  const list = useMemo(() => {
    const n = norm(q.trim());
    const all = foods.filter((f) => f.id !== planned.id || n);
    return (n ? all.filter((f) => norm(f.name).includes(n)) : all).slice(0, 8);
  }, [foods, q, planned.id]);

  const pick = (f: FoodItem) => {
    setPicked(f);
    // mesma unidade do previsto: sugere a mesma quantidade; senão, a porção base
    setQty(f.unit === planned.unit ? item.quantity : f.baseAmount);
  };

  const pickedM = picked ? macrosOf(picked, qty) : null;
  const valid = mode === "catalog" ? Boolean(picked && qty > 0) : text.trim().length > 0 && kcal >= 0;

  const save = () => {
    haptic(12);
    const swap: Swap =
      mode === "catalog" && picked && pickedM
        ? { name: picked.name, macros: pickedM, foodId: picked.id, quantity: qty }
        : { name: text.trim(), macros: scaled(plannedM, kcal) };
    setSwap(date, item.id, swap);
    onClose();
  };

  return (
    <div className="grid gap-4">
      <Banner>
        Previsto: <b>{formatQty(item.quantity, planned.unit)} de {planned.name}</b> ({fmt(plannedM.kcal)} kcal).
        {item.note ? ` Sugestão do plano: ${item.note}.` : ""}
      </Banner>

      <Segmented<Mode> label="Como informar" value={mode} onChange={setMode} options={[{ id: "catalog", label: "Do catálogo" }, { id: "text", label: "Escrever" }]} />

      {mode === "catalog" ? (
        <div className="grid gap-3">
          <TextField label="Buscar o que você comeu" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: ovo, pão, banana" autoComplete="off" />
          <Group>
            {list.map((f) => (
              <Row key={f.id} title={f.name} sub={`${fmt(f.macros.kcal)} kcal por ${formatQty(f.baseAmount, f.unit)}`} onClick={() => pick(f)} chevron={false} right={picked?.id === f.id ? <span className="t-small-sb text-link">Escolhido</span> : undefined} />
            ))}
            {list.length === 0 && <p className="t-small py-5 text-center text-tx2">Nenhum alimento com esse nome. Use “Escrever”.</p>}
          </Group>
          {picked && pickedM && (
            <div className="grid gap-2">
              <NumField label={`Quantidade de ${picked.name} (${unitLabel(picked)})`} value={qty} onCommit={(n) => n && setQty(n)} min={0.1} max={5000} decimals={picked.unit === "un" ? 1 : 0} unit={unitLabel(picked)} />
              <p className="t-small text-tx2">≈ {fmt(pickedM.kcal)} kcal · P {fmt(pickedM.protein)} g · C {fmt(pickedM.carbs)} g · G {fmt(pickedM.fat)} g</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <TextField label="O que você comeu?" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: pão com ovo mexido" autoComplete="off" />
          <NumField label="Calorias (estimativa)" hint="Se não souber, deixe a do plano. Os macros ficam proporcionais ao que estava previsto." value={kcal} onCommit={(n) => setKcal(n ?? 0)} min={0} max={5000} decimals={0} unit="kcal" />
        </div>
      )}

      <div className="grid gap-1">
        <Button disabled={!valid} onClick={save}>
          Comi isto
        </Button>
        {current && (
          <Button
            variant="link"
            onClick={() => {
              setSwap(date, item.id, null);
              onClose();
            }}
          >
            Voltar ao previsto
          </Button>
        )}
      </div>
    </div>
  );
}

/** “Comi outra coisa”: troca o item previsto pelo que a pessoa realmente comeu, mantendo calorias e nota. */
export function SwapSheet() {
  const sheet = useNav((s) => s.sheet);
  const sheetDate = useNav((s) => s.sheetDate);
  const sheetItem = useNav((s) => s.sheetItem);
  const openSheet = useNav((s) => s.openSheet);
  const d = useDay();
  const date = sheetDate ?? d.todayKey;
  const found = useMemo(() => {
    for (const m of d.plan.meals) {
      const item = m.items.find((i) => i.id === sheetItem);
      if (item && d.foods[item.foodId]) return { item, food: d.foods[item.foodId] };
    }
    return null;
  }, [d.plan, d.foods, sheetItem]);

  return (
    <Sheet open={sheet === "swap" && found !== null} title="O que você comeu?" onClose={() => openSheet(null)}>
      {found && <SwapForm key={`${date}:${found.item.id}`} date={date} item={found.item} planned={found.food} onClose={() => openSheet(null)} />}
    </Sheet>
  );
}
