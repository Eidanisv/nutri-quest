"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calcGet, consumedTotals, toDateKey, type FoodMap } from "./calc";
import { DEFAULT_FOODS, DEFAULT_PLAN, DEFAULT_USER } from "./seed";
import type { DailyLog, FoodItem, Meal, MealPlan, PlanItem, User } from "./types";

/** Tudo o que é seu. É exatamente isto que vai para o arquivo de backup. */
export interface AppData {
  user: User;
  foods: FoodItem[];
  plan: MealPlan;
  logs: Record<string, DailyLog>;
  /** ids de alimentos marcados na lista de compras, por semana (chave = segunda-feira) */
  shopping: Record<string, string[]>;
}

interface State extends AppData {
  toggleItem: (date: string, itemId: string) => void;
  addWater: (date: string, ml: number) => void;
  setWater: (date: string, ml: number) => void;
  /** kg = null remove a pesagem do dia. */
  setWeight: (date: string, kg: number | null) => void;
  toggleShopping: (week: string, foodId: string) => void;
  updateUser: (patch: Partial<User>) => void;

  // Editor de dieta
  addMeal: (name: string, time: string) => void;
  updateMeal: (mealId: string, patch: Partial<Pick<Meal, "name" | "time">>) => void;
  deleteMeal: (mealId: string) => void;
  addItem: (mealId: string, foodId: string, quantity: number) => void;
  updateItem: (mealId: string, itemId: string, patch: Partial<Pick<PlanItem, "quantity" | "note">>) => void;
  deleteItem: (mealId: string, itemId: string) => void;

  // Catálogo
  upsertFood: (food: FoodItem) => void;
  /** Não apaga alimento que ainda está em alguma refeição. */
  deleteFood: (foodId: string) => boolean;

  // Dados
  importData: (data: AppData) => void;
  resetAll: () => void;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const foodMap = (foods: FoodItem[]): FoodMap => Object.fromEntries(foods.map((f) => [f.id, f]));

const byTime = (a: Meal, b: Meal) => a.time.localeCompare(b.time);

function blankLog(s: AppData, date: string): DailyLog {
  return (
    s.logs[date] ?? {
      date,
      mealPlanId: s.plan.id,
      checkedItemIds: [],
      waterMl: 0,
      consumed: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      getKcal: calcGet(s.user),
    }
  );
}

/** Depois de editar plano, alimentos ou perfil, o snapshot de hoje precisa acompanhar. */
function refreshToday(s: AppData): Record<string, DailyLog> {
  const key = toDateKey(new Date());
  const log = s.logs[key];
  if (!log) return s.logs;
  return {
    ...s.logs,
    [key]: {
      ...log,
      consumed: consumedTotals(s.plan, foodMap(s.foods), log.checkedItemIds),
      getKcal: calcGet(s.user),
    },
  };
}

const withPlan = (s: AppData, plan: MealPlan) => ({
  plan,
  logs: refreshToday({ ...s, plan }),
});

const initial = (): AppData => ({
  user: DEFAULT_USER,
  foods: DEFAULT_FOODS,
  plan: DEFAULT_PLAN,
  logs: {},
  shopping: {},
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),

      toggleItem: (date, itemId) =>
        set((s) => {
          const log = blankLog(s, date);
          const checked = log.checkedItemIds.includes(itemId)
            ? log.checkedItemIds.filter((i) => i !== itemId)
            : [...log.checkedItemIds, itemId];
          return {
            logs: {
              ...s.logs,
              [date]: {
                ...log,
                checkedItemIds: checked,
                consumed: consumedTotals(s.plan, foodMap(s.foods), checked),
                getKcal: calcGet(s.user),
              },
            },
          };
        }),

      addWater: (date, ml) =>
        set((s) => {
          const log = blankLog(s, date);
          return { logs: { ...s.logs, [date]: { ...log, waterMl: Math.max(0, log.waterMl + ml) } } };
        }),

      setWater: (date, ml) =>
        set((s) => ({
          logs: { ...s.logs, [date]: { ...blankLog(s, date), waterMl: Math.max(0, ml) } },
        })),

      setWeight: (date, kg) =>
        set((s) => {
          const log = { ...blankLog(s, date) };
          if (kg === null) delete log.weightKg;
          else log.weightKg = kg;
          const logs = { ...s.logs, [date]: log };
          // O peso do perfil (usado na TMB) acompanha a pesagem mais recente.
          const latest = Object.values(logs)
            .filter((l) => l.weightKg !== undefined)
            .sort((a, b) => a.date.localeCompare(b.date))
            .at(-1);
          const user = latest ? { ...s.user, weightKg: latest.weightKg! } : s.user;
          return { user, logs: refreshToday({ ...s, user, logs }) };
        }),

      toggleShopping: (week, foodId) =>
        set((s) => {
          const cur = s.shopping[week] ?? [];
          return {
            shopping: {
              ...s.shopping,
              [week]: cur.includes(foodId) ? cur.filter((i) => i !== foodId) : [...cur, foodId],
            },
          };
        }),

      updateUser: (patch) =>
        set((s) => {
          const user = { ...s.user, ...patch };
          return { user, logs: refreshToday({ ...s, user }) };
        }),

      addMeal: (name, time) =>
        set((s) =>
          withPlan(s, {
            ...s.plan,
            meals: [...s.plan.meals, { id: uid(), name, time, items: [] }].sort(byTime),
          }),
        ),

      updateMeal: (mealId, patch) =>
        set((s) =>
          withPlan(s, {
            ...s.plan,
            meals: s.plan.meals.map((m) => (m.id === mealId ? { ...m, ...patch } : m)).sort(byTime),
          }),
        ),

      deleteMeal: (mealId) =>
        set((s) => withPlan(s, { ...s.plan, meals: s.plan.meals.filter((m) => m.id !== mealId) })),

      addItem: (mealId, foodId, quantity) =>
        set((s) =>
          withPlan(s, {
            ...s.plan,
            meals: s.plan.meals.map((m) =>
              m.id === mealId ? { ...m, items: [...m.items, { id: uid(), foodId, quantity }] } : m,
            ),
          }),
        ),

      updateItem: (mealId, itemId, patch) =>
        set((s) =>
          withPlan(s, {
            ...s.plan,
            meals: s.plan.meals.map((m) =>
              m.id === mealId
                ? { ...m, items: m.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
                : m,
            ),
          }),
        ),

      deleteItem: (mealId, itemId) =>
        set((s) =>
          withPlan(s, {
            ...s.plan,
            meals: s.plan.meals.map((m) =>
              m.id === mealId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m,
            ),
          }),
        ),

      upsertFood: (food) =>
        set((s) => {
          const exists = s.foods.some((f) => f.id === food.id);
          const foods = exists ? s.foods.map((f) => (f.id === food.id ? food : f)) : [...s.foods, food];
          return { foods, logs: refreshToday({ ...s, foods }) };
        }),

      deleteFood: (foodId) => {
        const s = get();
        const used = s.plan.meals.some((m) => m.items.some((i) => i.foodId === foodId));
        if (used) return false;
        set({ foods: s.foods.filter((f) => f.id !== foodId) });
        return true;
      },

      importData: (data) => set((s) => ({ ...data, logs: refreshToday({ ...s, ...data }) })),

      resetAll: () => set(initial()),
    }),
    {
      name: "fuel-v2",
      version: 2,
      // v2: dados pessoais saíram do código. Quem já usava o app mantém tudo
      // (perfil, dieta, registros) e ganha o catálogo básico de alimentos.
      migrate: (persisted, version) => {
        const s = persisted as Partial<AppData>;
        if (version >= 2) return s as State;
        const have = new Set((s.foods ?? []).map((f) => f.id));
        return {
          ...initial(),
          ...s,
          user: { ...DEFAULT_USER, ...(s.user ?? {}), onboarded: true },
          foods: [...(s.foods ?? []), ...DEFAULT_FOODS.filter((f) => !have.has(f.id))],
        } as State;
      },
    },
  ),
);

/** Evita mismatch de hidratação: o localStorage só existe no cliente. */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    setH(true);
  }, []);
  return h;
}
