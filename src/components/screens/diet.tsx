"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABEL, CATEGORY_ORDER, fmt, formatQty, macrosOf, planTotals } from "@/lib/calc";
import { useFoodMap } from "@/lib/derived";
import { confirmDanger } from "@/lib/dialog";
import { useNav } from "@/lib/nav";
import { calcGet } from "@/lib/calc";
import { uid, useStore } from "@/lib/store";
import type { FoodCategory, FoodItem, PlanItem, Unit } from "@/lib/types";
import { Button, Card, Chip, Group, Icon, NavBar, NumField, Page, Row, Select, Sheet, TextField, inputCls } from "../kit";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "alimento";
const per = (f: FoodItem) => (f.unit === "un" ? "un" : `100 ${f.unit}`);
const macroLine = (f: FoodItem) => `${fmt(f.macros.kcal)} kcal · P ${fmt(f.macros.protein, 1)} · C ${fmt(f.macros.carbs, 1)} · G ${fmt(f.macros.fat, 1)} / ${per(f)}`;

// ───────────── Minha dieta ─────────────

export function DietScreen() {
  const { pop, push } = useNav();
  const plan = useStore((s) => s.plan);
  const user = useStore((s) => s.user);
  const addMeal = useStore((s) => s.addMeal);
  const foods = useFoodMap();
  const totals = useMemo(() => planTotals(plan, foods), [plan, foods]);
  const get = calcGet(user);
  const balance = get - totals.kcal;

  return (
    <Page tabbar={false}>
      <NavBar back="Perfil" onBack={pop} />
      <div>
        <h1 className="t-t28">Minha dieta</h1>
        <p className="t-body text-tx2">{plan.name}</p>
      </div>

      <Card className="grid gap-2.5">
        <p className="t-t28 tnum">
          {fmt(totals.kcal)} <span className="t-body font-normal text-tx2">kcal por dia</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip>P {fmt(totals.protein)} g</Chip>
          <Chip>C {fmt(totals.carbs)} g</Chip>
          <Chip>G {fmt(totals.fat)} g</Chip>
          <Chip>Fibra {fmt(totals.fiber)} g</Chip>
        </div>
        {totals.kcal > 0 && (
          <p className="t-small text-tx2">
            Seu GET é {fmt(get)} kcal →{" "}
            <span className={balance >= 0 ? "text-ok" : "text-err"}>
              {balance >= 0 ? "déficit" : "superávit"} de {fmt(Math.abs(balance))} kcal/dia
            </span>
            . As mudanças valem na hora e o dia de hoje é recalculado.
          </p>
        )}
      </Card>

      {plan.meals.length > 0 ? (
        <Group>
          {plan.meals.map((m) => {
            const kcal = m.items.reduce((a, i) => (foods[i.foodId] ? a + macrosOf(foods[i.foodId], i.quantity).kcal : a), 0);
            return <Row key={m.id} title={m.name} sub={`${m.time} · ${m.items.length} ${m.items.length === 1 ? "item" : "itens"}`} value={`${fmt(kcal)} kcal`} onClick={() => push({ id: "meal-edit", mealId: m.id })} />;
          })}
        </Group>
      ) : (
        <Card className="t-small py-8 text-center text-tx2">Nenhuma refeição ainda. Crie a primeira e adicione os alimentos.</Card>
      )}

      <div className="grid gap-1">
        <Button variant="outline" size="md" onClick={() => push({ id: "meal-edit", mealId: addMeal("Nova refeição", "12:00") })}>
          Adicionar refeição
        </Button>
        <Button variant="link" size="md" disabled>
          Importar PDF do nutricionista · em breve
        </Button>
      </div>
      {totals.kcal > 0 && totals.fiber < 25 && (
        <p className="t-cap px-1 text-tx2">A fibra do plano está em cerca de {fmt(totals.fiber)} g por dia, abaixo do usual (25 g). Vale conversar com o nutricionista.</p>
      )}
    </Page>
  );
}

// ───────────── Editar refeição ─────────────

function ItemRow({ mealId, item }: { mealId: string; item: PlanItem }) {
  const foods = useFoodMap();
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const [open, setOpen] = useState(false);
  const f = foods[item.foodId];
  if (!f) return null;
  const m = macrosOf(f, item.quantity);
  const step = f.unit === "un" ? 1 : 10;
  const set = (q: number) => updateItem(mealId, item.id, { quantity: Math.max(f.unit === "un" ? 1 : 5, Math.round(q * 10) / 10) });

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2.5">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className="t-body block truncate">{f.name}</span>
          <span className={`t-cap block ${item.note ? "text-link" : "text-tx2"}`}>{item.note ? `↔ ${item.note}` : `${fmt(m.kcal)} kcal · P ${fmt(m.protein)} · C ${fmt(m.carbs)} · G ${fmt(m.fat)}`}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-sup p-0.5" role="group" aria-label={`Quantidade de ${f.name}`}>
          <button onClick={() => set(item.quantity - step)} aria-label="Diminuir" className="grid size-8 place-items-center rounded-full bg-bg text-blue active:opacity-60"><Icon name="minus" size={16} sw={2.4} /></button>
          <span className="t-small-sb tnum min-w-[58px] text-center">{formatQty(item.quantity, f.unit)}</span>
          <button onClick={() => set(item.quantity + step)} aria-label="Aumentar" className="grid size-8 place-items-center rounded-full bg-bg text-blue active:opacity-60"><Icon name="plus" size={16} sw={2.4} /></button>
        </div>
      </div>
      {open && (
        <div className="mt-3 grid gap-3">
          <NumField label="Quantidade exata" value={item.quantity} onCommit={(n) => n && updateItem(mealId, item.id, { quantity: n })} min={0.1} max={5000} decimals={1} unit={f.unit} />
          <TextField label="Substituição (opcional)" value={item.note ?? ""} onChange={(e) => updateItem(mealId, item.id, { note: e.target.value || undefined })} placeholder="Ex.: Maçã ou 100 g de uva" />
          <Button variant="link" size="sm" danger onClick={() => deleteItem(mealId, item.id)}>
            <Icon name="trash" size={16} /> Remover {f.name}
          </Button>
        </div>
      )}
    </div>
  );
}

export function MealEditScreen({ mealId }: { mealId: string }) {
  const pop = useNav((s) => s.pop);
  const meal = useStore((s) => s.plan.meals.find((m) => m.id === mealId));
  const updateMeal = useStore((s) => s.updateMeal);
  const deleteMeal = useStore((s) => s.deleteMeal);
  const addItem = useStore((s) => s.addItem);
  const foods = useFoodMap();
  const [picking, setPicking] = useState(false);
  if (!meal) return null;
  const kcal = meal.items.reduce((a, i) => (foods[i.foodId] ? a + macrosOf(foods[i.foodId], i.quantity).kcal : a), 0);

  return (
    <Page tabbar={false}>
      <NavBar back="Minha dieta" onBack={pop} right={<button onClick={pop} className="t-body-sb text-link">Concluir</button>} />
      <h1 className="t-t28">{meal.name || "Refeição"}</h1>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <TextField label="Nome" value={meal.name} onChange={(e) => updateMeal(meal.id, { name: e.target.value })} />
        <label className="block">
          <span className="t-small-sb mb-1.5 block">Horário</span>
          <input type="time" value={meal.time} onChange={(e) => e.target.value && updateMeal(meal.id, { time: e.target.value })} aria-label="Horário" className={`${inputCls} tnum`} />
        </label>
      </div>

      {meal.items.length > 0 ? (
        <Group>
          {meal.items.map((it) => (
            <ItemRow key={it.id} mealId={meal.id} item={it} />
          ))}
        </Group>
      ) : (
        <Card className="t-small py-6 text-center text-tx2">Nenhum alimento ainda.</Card>
      )}
      <p className="t-cap px-1 text-tx2">{fmt(kcal)} kcal nesta refeição · toque num alimento para ajustar a quantidade exata ou a substituição.</p>

      <Button variant="outline" size="md" onClick={() => setPicking(true)}>Adicionar alimento</Button>
      <Button
        variant="link"
        size="md"
        danger
        onClick={async () => {
          if (await confirmDanger(`Excluir "${meal.name}"?`, `A refeição e seus ${meal.items.length} itens serão removidos da dieta.`, "Excluir refeição")) {
            deleteMeal(meal.id);
            pop();
          }
        }}
      >
        Excluir refeição
      </Button>

      <FoodPicker open={picking} onClose={() => setPicking(false)} onPick={(f) => { addItem(meal.id, f.id, f.unit === "un" ? 1 : 100); setPicking(false); }} />
    </Page>
  );
}

// ───────────── Alimentos: formulário, busca, escolha e catálogo ─────────────

export function FoodForm({ initial, onSave, onDelete, deleteBlockedReason }: { initial?: FoodItem; onSave: (f: FoodItem) => void; onDelete?: () => void; deleteBlockedReason?: string }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<FoodCategory>(initial?.category ?? "proteins");
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? "g");
  const [m, setM] = useState(initial?.macros ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const set = (k: keyof typeof m) => (n: number | null) => setM((p) => ({ ...p, [k]: n ?? 0 }));
  const valid = name.trim().length > 0;

  return (
    <div className="grid gap-3.5">
      <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Peito de peru" />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Categoria" value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}>
          {CATEGORY_ORDER.map((c) => (<option key={c} value={c}>{CATEGORY_LABEL[c]}</option>))}
        </Select>
        <Select label="Medido em" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
          <option value="g">gramas</option>
          <option value="ml">ml</option>
          <option value="un">unidade</option>
        </Select>
      </div>
      <p className="t-cap-sb tracking-wide text-tx2 uppercase">Valores {unit === "un" ? "por unidade" : `por 100 ${unit}`} (rótulo ou tabela TACO)</p>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Calorias" value={m.kcal} onCommit={set("kcal")} unit="kcal" />
        <NumField label="Proteína" value={m.protein} onCommit={set("protein")} unit="g" />
        <NumField label="Carboidrato" value={m.carbs} onCommit={set("carbs")} unit="g" />
        <NumField label="Gordura" value={m.fat} onCommit={set("fat")} unit="g" />
        <NumField label="Fibra" value={m.fiber} onCommit={set("fiber")} unit="g" />
      </div>
      <div className="grid gap-1 pt-1">
        <Button disabled={!valid} onClick={() => onSave({ id: initial?.id ?? `${slug(name)}-${uid().slice(0, 4)}`, name: name.trim(), category, unit, baseAmount: unit === "un" ? 1 : 100, macros: m })}>
          Salvar alimento
        </Button>
        {onDelete && (deleteBlockedReason ? <p className="t-cap text-center text-tx2">{deleteBlockedReason}</p> : <Button variant="link" danger onClick={onDelete}>Excluir alimento</Button>)}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-bd px-3 py-2">
      <Icon name="search" size={18} className="text-tx2" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Buscar alimento" aria-label="Buscar alimento" className="t-body w-full bg-transparent outline-none placeholder:text-tx2" />
    </div>
  );
}

function useFiltered(foods: FoodItem[], q: string, cat: FoodCategory | "all") {
  return useMemo(() => {
    const n = norm(q);
    return foods.filter((f) => (cat === "all" || f.category === cat) && norm(f.name).includes(n)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [foods, q, cat]);
}

/** Escolher um alimento para uma refeição — ou cadastrar um novo na hora. */
export function FoodPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: FoodItem) => void }) {
  const foods = useStore((s) => s.foods);
  const upsert = useStore((s) => s.upsertFood);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const list = useFiltered(foods, q, "all");
  const close = () => { setCreating(false); setQ(""); onClose(); };

  return (
    <Sheet open={open} title={creating ? "Novo alimento" : "Adicionar alimento"} onClose={close}>
      {creating ? (
        <div className="grid gap-2">
          <FoodForm onSave={(f) => { upsert(f); setCreating(false); onPick(f); }} />
          <Button variant="link" onClick={() => setCreating(false)}>Voltar à busca</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <SearchBox value={q} onChange={setQ} />
          <Button variant="outline" size="md" onClick={() => setCreating(true)}>Cadastrar alimento novo</Button>
          <Group>
            {list.map((f) => (<Row key={f.id} title={f.name} sub={macroLine(f)} onClick={() => onPick(f)} chevron={false} />))}
            {list.length === 0 && <p className="t-small py-6 text-center text-tx2">Nenhum alimento com esse nome.</p>}
          </Group>
        </div>
      )}
    </Sheet>
  );
}

export function FoodsScreen() {
  const pop = useNav((s) => s.pop);
  const foods = useStore((s) => s.foods);
  const plan = useStore((s) => s.plan);
  const upsert = useStore((s) => s.upsertFood);
  const del = useStore((s) => s.deleteFood);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<FoodCategory | "all">("all");
  const [editing, setEditing] = useState<FoodItem | "new" | null>(null);
  const list = useFiltered(foods, q, cat);
  const usedIn = (id: string) => plan.meals.filter((m) => m.items.some((i) => i.foodId === id)).length;
  const cats = CATEGORY_ORDER.filter((c) => foods.some((f) => f.category === c));

  return (
    <Page tabbar={false}>
      <NavBar back="Perfil" onBack={pop} right={<button onClick={() => setEditing("new")} className="t-body-sb text-link">Novo</button>} />
      <h1 className="t-t28">Alimentos</h1>
      <SearchBox value={q} onChange={setQ} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Categoria">
        {(["all", ...cats] as const).map((c) => (
          <button key={c} role="radio" aria-checked={cat === c} onClick={() => setCat(c)} className={`t-small-sb shrink-0 rounded-full px-3.5 py-1.5 ${cat === c ? "bg-blue text-white" : "bg-bg"}`}>
            {c === "all" ? "Todos" : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <Group>
        {list.map((f) => (<Row key={f.id} title={f.name} sub={macroLine(f)} onClick={() => setEditing(f)} />))}
        {list.length === 0 && <p className="t-small py-8 text-center text-tx2">Nenhum alimento encontrado.</p>}
      </Group>

      <Sheet open={editing !== null} title={editing === "new" ? "Novo alimento" : "Editar alimento"} onClose={() => setEditing(null)}>
        {editing !== null && (
          <FoodForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? undefined : editing}
            onSave={(f) => { upsert(f); setEditing(null); }}
            onDelete={editing === "new" ? undefined : async () => {
              if (await confirmDanger(`Excluir "${editing.name}"?`, "O alimento sai do catálogo.", "Excluir alimento")) { del(editing.id); setEditing(null); }
            }}
            deleteBlockedReason={editing !== "new" && usedIn(editing.id) > 0 ? `Em uso em ${usedIn(editing.id)} refeição(ões). Remova da dieta para poder excluir.` : undefined}
          />
        )}
      </Sheet>
    </Page>
  );
}
