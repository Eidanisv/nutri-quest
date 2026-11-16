"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calcDayGet, consumedTotals, dietScore, toDateKey, type FoodMap } from "./calc";
import { DEFAULT_FOODS, DEFAULT_PLAN, DEFAULT_USER } from "./seed";
import type { DailyLog, FoodItem, Meal, MealPlan, PlanItem, User, Workout } from "./types";

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
  clearShopping: (week: string) => void;
  /** Marca (ou desmarca) todos os itens de uma refeição de uma vez. */
  /** checked=true marca como comido o que ainda falta (itens "não comi" ficam como estão); false limpa tudo da refeição. */
  setMealChecked: (date: string, mealId: string, checked: boolean) => void;
  /** Alterna "não comi" em um item (desmarca o "comi" dele). */
  toggleSkipped: (date: string, itemId: string) => void;
  /** Marca o treino do dia (null = não treinou). */
  setWorkout: (date: string, w: Workout | null) => void;
  /** Marca como "não comi" todos os itens da refeição que ainda não foram decididos. */
  skipMeal: (date: string, mealId: string) => void;
  updateUser: (patch: Partial<User>) => void;

  // Editor de dieta
  addMeal: (name: string, time: string) => string;
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

const scoreOf = (s: AppData, checked: string[], skipped: string[] | undefined): number | undefined =>
  dietScore(s.plan, foodMap(s.foods), checked, skipped) ?? undefined;

const byTime = (a: Meal, b: Meal) => a.time.localeCompare(b.time);

function blankLog(s: AppData, date: string): DailyLog {
  return (
    s.logs[date] ?? {
      date,
      mealPlanId: s.plan.id,
      checkedItemIds: [],
      waterMl: 0,
      consumed: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      getKcal: calcDayGet(s.user, undefined),
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
      getKcal: calcDayGet(s.user, log.workout),
      score: scoreOf(s, log.checkedItemIds, log.skippedItemIds),
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
                skippedItemIds: (log.skippedItemIds ?? []).filter((i) => i !== itemId),
                consumed: consumedTotals(s.plan, foodMap(s.foods), checked),
                getKcal: calcDayGet(s.user, log.workout),
                score: scoreOf(s, checked, (log.skippedItemIds ?? []).filter((i) => i !== itemId)),
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

      clearShopping: (week) => set((s) => ({ shopping: { ...s.shopping, [week]: [] } })),

      setMealChecked: (date, mealId, checked) =>
        set((s) => {
          const meal = s.plan.meals.find((m) => m.id === mealId);
          if (!meal) return {};
          const log = blankLog(s, date);
          const ids = new Set(meal.items.map((i) => i.id));
          const skipped = log.skippedItemIds ?? [];
          const rest = log.checkedItemIds.filter((i) => !ids.has(i));
          // marcar: o que já estava comido continua; o que falta vira comido; "não comi" é respeitado
          const next = checked ? [...new Set([...log.checkedItemIds, ...[...ids].filter((i) => !skipped.includes(i))])] : rest;
          return {
            logs: {
              ...s.logs,
              [date]: {
                ...log,
                checkedItemIds: next,
                skippedItemIds: checked ? skipped : skipped.filter((i) => !ids.has(i)),
                consumed: consumedTotals(s.plan, foodMap(s.foods), next),
                getKcal: calcDayGet(s.user, log.workout),
                score: scoreOf(s, next, checked ? skipped : skipped.filter((i) => !ids.has(i))),
              },
            },
          };
        }),

      toggleSkipped: (date, itemId) =>
        set((s) => {
          const log = blankLog(s, date);
          const skipped = log.skippedItemIds ?? [];
          const isSkipped = skipped.includes(itemId);
          const nextSkipped = isSkipped ? skipped.filter((i) => i !== itemId) : [...skipped, itemId];
          const checked = log.checkedItemIds.filter((i) => i !== itemId);
          return {
            logs: {
              ...s.logs,
              [date]: {
                ...log,
                checkedItemIds: checked,
                skippedItemIds: nextSkipped,
                consumed: consumedTotals(s.plan, foodMap(s.foods), checked),
                getKcal: calcDayGet(s.user, log.workout),
                score: scoreOf(s, checked, nextSkipped),
              },
            },
          };
        }),

      skipMeal: (date, mealId) =>
        set((s) => {
          const meal = s.plan.meals.find((m) => m.id === mealId);
          if (!meal) return {};
          const log = blankLog(s, date);
          const done = new Set([...log.checkedItemIds, ...(log.skippedItemIds ?? [])]);
          const add = meal.items.map((i) => i.id).filter((i) => !done.has(i));
          const skipped = [...(log.skippedItemIds ?? []), ...add];
          return {
            logs: {
              ...s.logs,
              [date]: {
                ...log,
                skippedItemIds: skipped,
                getKcal: calcDayGet(s.user, log.workout),
                score: scoreOf(s, log.checkedItemIds, skipped),
              },
            },
          };
        }),

      setWorkout: (date, w) =>
        set((s) => {
          const log = { ...blankLog(s, date) };
          if (w === null) delete log.workout;
          else log.workout = w;
          log.getKcal = calcDayGet(s.user, w);
          return { logs: { ...s.logs, [date]: log } };
        }),

      updateUser: (patch) =>
        set((s) => {
          const user = { ...s.user, ...patch };
          return { user, logs: refreshToday({ ...s, user }) };
        }),

      addMeal: (name, time) => {
        const id = uid();
        set((s) =>
          withPlan(s, {
            ...s.plan,
            meals: [...s.plan.meals, { id, name, time, items: [] }].sort(byTime),
          }),
        );
        return id;
      },

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
