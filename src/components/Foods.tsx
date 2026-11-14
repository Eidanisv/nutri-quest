"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABEL, CATEGORY_ORDER, fmt } from "@/lib/calc";
import { uid, useStore } from "@/lib/store";
import type { FoodCategory, FoodItem, Unit } from "@/lib/types";
import { Field, NumInput, Sheet, btnGhost, btnPrimary, inputCls } from "./ui";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const slug = (s: string) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "alimento";

const UNITS: { id: Unit; label: string }[] = [
  { id: "g", label: "gramas" },
  { id: "ml", label: "ml" },
  { id: "un", label: "unidade" },
];

/** Formulário de alimento: novo ou edição. Macros são "por 100 g/ml" ou "por unidade". */
export function FoodForm({
  initial,
  onSave,
  onDelete,
  deleteBlockedReason,
}: {
  initial?: FoodItem;
  onSave: (f: FoodItem) => void;
  onDelete?: () => void;
  deleteBlockedReason?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<FoodCategory>(initial?.category ?? "proteins");
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? "g");
  const [m, setM] = useState(
    initial?.macros ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const set = (k: keyof typeof m) => (n: number | null) => setM((p) => ({ ...p, [k]: n ?? 0 }));

  const base = unit === "un" ? "por unidade" : `por 100 ${unit}`;
  const valid = name.trim().length > 0 && m.kcal >= 0;

  return (
    <div className="grid gap-3">
      <Field label="Nome">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Peito de peru"
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FoodCategory)}
            className={inputCls}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Medido em">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className={inputCls}
          >
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="font-mono text-[11px] tracking-wider text-dim uppercase">
        Valores {base} (rótulo ou tabela TACO)
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorias">
          <NumInput value={m.kcal} onCommit={set("kcal")} unit="kcal" />
        </Field>
        <Field label="Proteína">
          <NumInput value={m.protein} onCommit={set("protein")} unit="g" />
        </Field>
        <Field label="Carboidrato">
          <NumInput value={m.carbs} onCommit={set("carbs")} unit="g" />
        </Field>
        <Field label="Gordura">
          <NumInput value={m.fat} onCommit={set("fat")} unit="g" />
        </Field>
        <Field label="Fibra">
          <NumInput value={m.fiber} onCommit={set("fiber")} unit="g" />
        </Field>
      </div>

      <button
        disabled={!valid}
        onClick={() =>
          onSave({
            id: initial?.id ?? `${slug(name)}-${uid().slice(0, 4)}`,
            name: name.trim(),
            category,
            unit,
            baseAmount: unit === "un" ? 1 : 100,
            macros: m,
          })
        }
        className={btnPrimary}
      >
        Salvar alimento
      </button>

      {onDelete &&
        (deleteBlockedReason ? (
          <p className="text-center text-xs text-dim">{deleteBlockedReason}</p>
        ) : (
          <button onClick={onDelete} className={`${btnGhost} text-alert`}>
            Excluir alimento
          </button>
        ))}
    </div>
  );
}

function FoodList({
  foods,
  onPick,
}: {
  foods: FoodItem[];
  onPick: (f: FoodItem) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = norm(q);
    return foods
      .filter((f) => norm(f.name).includes(n))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [foods, q]);

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar alimento…"
        aria-label="Buscar alimento"
        className={inputCls}
      />
      <ul className="mt-2 divide-y divide-line/70">
        {list.map((f) => (
          <li key={f.id}>
            <button
              onClick={() => onPick(f)}
              className="flex w-full items-center justify-between gap-3 py-3 text-left active:bg-raised"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm">{f.name}</span>
                <span className="font-mono text-[11px] text-dim">
                  {CATEGORY_LABEL[f.category]} · P {fmt(f.macros.protein)} · C {fmt(f.macros.carbs)} · G{" "}
                  {fmt(f.macros.fat)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-dim">
                {fmt(f.macros.kcal)} kcal/{f.unit === "un" ? "un" : `100${f.unit}`}
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="py-6 text-center text-sm text-dim">Nenhum alimento com esse nome.</li>
        )}
      </ul>
    </>
  );
}

/** Escolher um alimento para uma refeição — ou cadastrar um novo na hora. */
export function FoodPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (f: FoodItem) => void;
}) {
  const foods = useStore((s) => s.foods);
  const upsert = useStore((s) => s.upsertFood);
  const [creating, setCreating] = useState(false);

  const close = () => {
    setCreating(false);
    onClose();
  };

  return (
    <Sheet open={open} title={creating ? "Novo alimento" : "Adicionar alimento"} onClose={close}>
      {creating ? (
        <>
          <FoodForm
            onSave={(f) => {
              upsert(f);
              setCreating(false);
              onPick(f);
            }}
          />
          <button onClick={() => setCreating(false)} className={`${btnGhost} mt-2 w-full`}>
            Voltar à busca
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setCreating(true)} className={`${btnGhost} mb-3 w-full`}>
            + Cadastrar alimento novo
          </button>
          <FoodList foods={foods} onPick={onPick} />
        </>
      )}
    </Sheet>
  );
}

/** Aba "Alimentos" dos ajustes: editar valores nutricionais e apagar o que não usa. */
export function FoodCatalog() {
  const foods = useStore((s) => s.foods);
  const plan = useStore((s) => s.plan);
  const upsert = useStore((s) => s.upsertFood);
  const del = useStore((s) => s.deleteFood);
  const [editing, setEditing] = useState<FoodItem | "new" | null>(null);

  const usedIn = (id: string) => plan.meals.filter((m) => m.items.some((i) => i.foodId === id)).length;

  return (
    <div className="grid gap-3">
      <button onClick={() => setEditing("new")} className={btnPrimary}>
        + Novo alimento
      </button>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <FoodList foods={foods} onPick={(f) => setEditing(f)} />
      </div>

      <Sheet
        open={editing !== null}
        title={editing === "new" ? "Novo alimento" : "Editar alimento"}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <FoodForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? undefined : editing}
            onSave={(f) => {
              upsert(f);
              setEditing(null);
            }}
            onDelete={
              editing === "new"
                ? undefined
                : () => {
                    if (window.confirm(`Excluir "${editing.name}" do catálogo?`)) {
                      del(editing.id);
                      setEditing(null);
                    }
                  }
            }
            deleteBlockedReason={
              editing !== "new" && usedIn(editing.id) > 0
                ? `Em uso em ${usedIn(editing.id)} refeição(ões). Remova da dieta para poder excluir.`
                : undefined
            }
          />
        )}
      </Sheet>
    </div>
  );
}
