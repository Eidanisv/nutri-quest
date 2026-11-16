"use client";

import { useEffect, useMemo, useState } from "react";
import { calcBmr, calcDayBase, calcDayGet, dietScore, consumedTotals, planTotals, toDateKey, workoutKcal, type FoodMap } from "./calc";
import { useStore } from "./store";

export function useFoodMap(): FoodMap {
  const foods = useStore((s) => s.foods);
  return useMemo(() => Object.fromEntries(foods.map((f) => [f.id, f])), [foods]);
}

/** Data de hoje que se atualiza sozinha se o app ficar aberto de um dia para o outro. */
export function useTodayDate(): Date {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setD((cur) => (toDateKey(cur) === toDateKey(new Date()) ? cur : new Date()));
    document.addEventListener("visibilitychange", tick);
    const t = setInterval(tick, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", tick);
      clearInterval(t);
    };
  }, []);
  return d;
}

export function useOnline(): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(navigator.onLine);
    const a = () => setOn(true);
    const b = () => setOn(false);
    window.addEventListener("online", a);
    window.addEventListener("offline", b);
    return () => {
      window.removeEventListener("online", a);
      window.removeEventListener("offline", b);
    };
  }, []);
  return on;
}

/** Tudo o que as telas do dia precisam, calculado uma vez. */
export function useDay() {
  const user = useStore((s) => s.user);
  const plan = useStore((s) => s.plan);
  const logs = useStore((s) => s.logs);
  const foods = useFoodMap();
  const today = useTodayDate();
  const todayKey = toDateKey(today);
  const log = logs[todayKey];
  const checkedIds = log?.checkedItemIds;
  const checked = useMemo(() => new Set(checkedIds ?? []), [checkedIds]);
  const skippedIds = log?.skippedItemIds;
  const skipped = useMemo(() => new Set(skippedIds ?? []), [skippedIds]);
  /** item decidido = comi ou não comi */
  const resolved = useMemo(() => new Set([...(checkedIds ?? []), ...(skippedIds ?? [])]), [checkedIds, skippedIds]);
  const planned = useMemo(() => planTotals(plan, foods), [plan, foods]);
  const consumed = useMemo(() => consumedTotals(plan, foods, checkedIds ?? []), [plan, foods, checkedIds]);
  const workout = log?.workout;
  const get = calcDayGet(user, workout);
  const baseGet = calcDayBase(user);
  const trainKcal = workoutKcal(workout, user.weightKg);
  // Nota de hoje até agora: só entram as refeições que já passaram do horário ou já foram marcadas.
  const score = useMemo(() => {
    const now = new Date();
    return dietScore(plan, foods, checkedIds, skippedIds, now.getHours() * 60 + now.getMinutes());
  }, [plan, foods, checkedIds, skippedIds]);
  const bmr = calcBmr(user);
  const nextMeal = plan.meals.find((m) => m.items.some((i) => !resolved.has(i.id)));
  return { user, plan, logs, foods, today, todayKey, log, checked, skipped, resolved, planned, consumed, get, baseGet, trainKcal, workout, score, bmr, nextMeal };
}

export const dateLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
