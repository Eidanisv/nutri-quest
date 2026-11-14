import type { AppData } from "./store";
import type { FoodItem, MealPlan, User } from "./types";

const APP = "fuel";

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ app: APP, version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

type Parsed = { ok: true; data: AppData } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Valida o arquivo de backup e remove itens que apontam para alimentos inexistentes. */
export function parseBackup(text: string): Parsed {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "O arquivo não é um JSON válido." };
  }
  if (!isObj(raw) || raw.app !== APP || !isObj(raw.data))
    return { ok: false, error: "Este arquivo não é um backup do FUEL." };

  const d = raw.data;
  if (!isObj(d.user) || !Array.isArray(d.foods) || !isObj(d.plan) || !Array.isArray(d.plan.meals))
    return { ok: false, error: "Backup incompleto (faltam perfil, alimentos ou dieta)." };

  const u = d.user as unknown as User;
  if (!num(u.weightKg) || !num(u.heightCm) || !num(u.age) || !num(u.activityFactor))
    return { ok: false, error: "Perfil inválido no backup." };

  const foods = (d.foods as FoodItem[]).filter(
    (f) => isObj(f) && typeof f.id === "string" && isObj(f.macros) && num(f.baseAmount) && f.baseAmount > 0,
  );
  const ids = new Set(foods.map((f) => f.id));
  const plan = d.plan as unknown as MealPlan;
  const cleanPlan: MealPlan = {
    ...plan,
    meals: plan.meals.map((m) => ({
      ...m,
      items: (m.items ?? []).filter((i) => ids.has(i.foodId) && num(i.quantity)),
    })),
  };

  return {
    ok: true,
    data: {
      user: { ...u, onboarded: true },
      foods,
      plan: cleanPlan,
      logs: isObj(d.logs) ? (d.logs as AppData["logs"]) : {},
      shopping: isObj(d.shopping) ? (d.shopping as AppData["shopping"]) : {},
    },
  };
}
