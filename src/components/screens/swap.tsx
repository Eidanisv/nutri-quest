"use client";

import { useMemo, useState } from "react";
import { fmt, formatQty, macrosOf } from "@/lib/calc";
import { useDay } from "@/lib/derived";
import { EQUIV_GROUPS, equivDetail, fmtPortions, groupFor, norm, portionsOf, type EquivItem } from "@/lib/equivalents";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { useStore } from "@/lib/store";
import type { FoodItem, Macros, PlanItem, Swap } from "@/lib/types";
import { Banner, Button, Group, NumField, Row, Segmented, Sheet, Stepper, TextField } from "../kit";

type Mode = "equiv" | "catalog" | "text";

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
  const inferred = useMemo(() => groupFor(planned.name), [planned.name]);

  const [mode, setMode] = useState<Mode>(current ? (current.foodId ? "catalog" : current.detail ? "equiv" : "text") : "equiv");

  // — equivalentes da nutricionista
  const [gid, setGid] = useState<string>(inferred?.id ?? "all");
  const [eq, setEq] = useState("");
  const [pickedEq, setPickedEq] = useState<{ it: EquivItem; groupId: string } | null>(null);
  const [portions, setPortions] = useState<number>(inferred ? portionsOf(inferred, plannedM.kcal) : 1);

  // — catálogo
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<FoodItem | null>(current?.foodId ? (foods.find((f) => f.id === current.foodId) ?? null) : null);
  const [qty, setQty] = useState<number>(current?.quantity ?? 0);

  // — texto livre
  const [text, setText] = useState(current && !current.foodId && !current.detail ? current.name : "");
  const [kcal, setKcal] = useState<number>(current && !current.foodId && !current.detail ? current.macros.kcal : Math.round(plannedM.kcal));

  const eqList = useMemo(() => {
    const n = norm(eq.trim());
    const groups = EQUIV_GROUPS.filter((g) => n || gid === "all" || g.id === gid);
    return groups.flatMap((g) => g.items.filter((i) => !n || norm(i.name).includes(n)).map((it) => ({ it, g })));
  }, [eq, gid]);
  const eqGroup = pickedEq ? EQUIV_GROUPS.find((g) => g.id === pickedEq.groupId)! : null;

  const catList = useMemo(() => {
    const n = norm(q.trim());
    const all = foods.filter((f) => f.id !== planned.id || n);
    return (n ? all.filter((f) => norm(f.name).includes(n)) : all).slice(0, 8);
  }, [foods, q, planned.id]);

  const pickCatalog = (f: FoodItem) => {
    setPicked(f);
    setQty(f.unit === planned.unit ? item.quantity : f.baseAmount);
  };
  const pickEquiv = (it: EquivItem, groupId: string) => {
    const g = EQUIV_GROUPS.find((x) => x.id === groupId)!;
    setPickedEq({ it, groupId });
    // mesma família do item previsto: mantém as porções dele; outra família: sugere pelo valor calórico
    setPortions(portionsOf(g, plannedM.kcal));
  };

  const pickedM = picked ? macrosOf(picked, qty) : null;
  const eqKcal = eqGroup ? eqGroup.kcal * portions : 0;
  const valid = mode === "equiv" ? Boolean(pickedEq) : mode === "catalog" ? Boolean(picked && qty > 0) : text.trim().length > 0 && kcal >= 0;

  const save = () => {
    haptic(12);
    let swap: Swap;
    if (mode === "equiv" && pickedEq && eqGroup) {
      swap = { name: pickedEq.it.name, detail: equivDetail(pickedEq.it, portions), macros: scaled(plannedM, eqKcal) };
    } else if (mode === "catalog" && picked && pickedM) {
      swap = { name: picked.name, macros: pickedM, foodId: picked.id, quantity: qty };
    } else {
      swap = { name: text.trim(), macros: scaled(plannedM, kcal) };
    }
    setSwap(date, item.id, swap);
    onClose();
  };

  return (
    <div className="grid gap-4">
      <Banner>
        Previsto: <b>{formatQty(item.quantity, planned.unit)} de {planned.name}</b> ({fmt(plannedM.kcal)} kcal).
        {item.note ? ` Sugestão do plano: ${item.note}.` : ""}
      </Banner>

      <Segmented<Mode> label="Como informar" value={mode} onChange={setMode} options={[{ id: "equiv", label: "Equivalentes" }, { id: "catalog", label: "Catálogo" }, { id: "text", label: "Escrever" }]} />

      {mode === "equiv" && (
        <div className="grid gap-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Grupo">
            {[{ id: "all", label: "Todos" }, ...EQUIV_GROUPS].map((g) => (
              <button key={g.id} role="radio" aria-checked={gid === g.id} onClick={() => setGid(g.id)} className={`t-small-sb shrink-0 rounded-full px-3.5 py-1.5 ${gid === g.id ? "bg-blue text-white" : "bg-sup"}`}>
                {g.label}
              </button>
            ))}
          </div>
          <TextField label="Buscar" value={eq} onChange={(e) => setEq(e.target.value)} placeholder="Ex.: ovo, pão francês, maçã" autoComplete="off" />

          {pickedEq && eqGroup && (
            <div className="grid gap-2 rounded-xl bg-blue/10 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="t-body-sb">{pickedEq.it.name}</p>
                  <p className="t-small text-tx2">{equivDetail(pickedEq.it, portions)}</p>
                </div>
                <Stepper
                  label="Porções"
                  value={fmtPortions(portions)}
                  onMinus={() => setPortions((p) => Math.max(0.5, p - 0.5))}
                  onPlus={() => setPortions((p) => Math.min(10, p + 0.5))}
                />
              </div>
              <p className="t-cap text-tx2">
                ≈ {fmt(eqKcal)} kcal ({fmt(eqGroup.kcal)} kcal por porção do grupo “{eqGroup.label}”). Mesma conta que a folha do nutricionista.
              </p>
            </div>
          )}

          <Group>
            {eqList.map(({ it, g }) => (
              <Row
                key={`${g.id}:${it.name}`}
                title={it.name}
                sub={`${it.measure} · ${fmt(it.amount, it.amount % 1 ? 1 : 0)} ${it.unit}${gid === "all" || eq ? ` · ${g.label}` : ""}`}
                onClick={() => pickEquiv(it, g.id)}
                chevron={false}
                right={pickedEq?.it.name === it.name && pickedEq.groupId === g.id ? <span className="t-small-sb text-link">Escolhido</span> : undefined}
              />
            ))}
            {eqList.length === 0 && <p className="t-small py-5 text-center text-tx2">Nada com esse nome na lista do nutricionista. Use “Catálogo” ou “Escrever”.</p>}
          </Group>
        </div>
      )}

      {mode === "catalog" && (
        <div className="grid gap-3">
          <TextField label="Buscar o que você comeu" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: ovo, pão, banana" autoComplete="off" />
          <Group>
            {catList.map((f) => (
              <Row key={f.id} title={f.name} sub={`${fmt(f.macros.kcal)} kcal por ${formatQty(f.baseAmount, f.unit)}`} onClick={() => pickCatalog(f)} chevron={false} right={picked?.id === f.id ? <span className="t-small-sb text-link">Escolhido</span> : undefined} />
            ))}
            {catList.length === 0 && <p className="t-small py-5 text-center text-tx2">Nenhum alimento com esse nome. Use “Escrever”.</p>}
          </Group>
          {picked && pickedM && (
            <div className="grid gap-2">
              <NumField label={`Quantidade de ${picked.name} (${unitLabel(picked)})`} value={qty} onCommit={(n) => n && setQty(n)} min={0.1} max={5000} decimals={picked.unit === "un" ? 1 : 0} unit={unitLabel(picked)} />
              <p className="t-small text-tx2">≈ {fmt(pickedM.kcal)} kcal · P {fmt(pickedM.protein)} g · C {fmt(pickedM.carbs)} g · G {fmt(pickedM.fat)} g</p>
            </div>
          )}
        </div>
      )}

      {mode === "text" && (
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
