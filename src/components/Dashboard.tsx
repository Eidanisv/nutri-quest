"use client";

import { useEffect, useMemo, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  buildWeek,
  calcBmr,
  calcGet,
  consumedTotals,
  planTotals,
  toDateKey,
  type FoodMap,
} from "@/lib/calc";
import { useHydrated, useStore } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { SyncDot } from "./Account";
import { EnergyPanel } from "./EnergyPanel";
import { HydrationTracker } from "./HydrationTracker";
import { MealCard } from "./MealCard";
import { Onboarding } from "./Onboarding";
import { Settings, type SettingsTab } from "./Settings";
import { ShoppingList } from "./ShoppingList";
import { WeekChart } from "./WeekChart";
import { WeightPanel } from "./WeightPanel";

type Tab = "today" | "shopping" | "week" | "weight" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "shopping", label: "Compras" },
  { id: "week", label: "Semana" },
  { id: "weight", label: "Peso" },
];

export function Dashboard() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("today");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");

  const user = useStore((s) => s.user);
  const foodsArr = useStore((s) => s.foods);
  const plan = useStore((s) => s.plan);
  const logs = useStore((s) => s.logs);
  const toggleItem = useStore((s) => s.toggleItem);
  const addWater = useStore((s) => s.addWater);
  const setWater = useStore((s) => s.setWater);
  const setWeight = useStore((s) => s.setWeight);
  const updateUser = useStore((s) => s.updateUser);

  // Liga a sincronização (se houver chaves do Supabase) depois que o estado local carregou.
  useEffect(() => {
    if (hydrated) useSync.getState().init();
  }, [hydrated]);

  const foods: FoodMap = useMemo(
    () => Object.fromEntries(foodsArr.map((f) => [f.id, f])),
    [foodsArr],
  );

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const log = logs[todayKey];
  const checked = useMemo(() => new Set(log?.checkedItemIds ?? []), [log]);

  const nextMealId = plan.meals.find((m) => m.items.some((i) => !checked.has(i.id)))?.id;

  const bmr = calcBmr(user);
  const get = calcGet(user);
  const planned = useMemo(() => planTotals(plan, foods), [plan, foods]);
  const consumed = useMemo(
    () => consumedTotals(plan, foods, log?.checkedItemIds ?? []),
    [plan, foods, log],
  );
  const week = useMemo(() => buildWeek(logs, get, today), [logs, get, today]);

  if (!hydrated) {
    return <div className="min-h-dvh" aria-busy />;
  }

  if (!user.onboarded) {
    return (
      <Onboarding
        onDone={() => {
          updateUser({ onboarded: true });
          setSettingsTab("diet");
          setTab("settings");
        }}
      />
    );
  }

  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <MotionConfig reducedMotion="user">
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-6 pb-28">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-[0.25em]">
            FUEL<span className="text-neon">_</span>
          </h1>
          <p className="text-xs text-dim">{dateLabel}</p>
        </div>
        <button
          onClick={() => setTab("settings")}
          aria-label="Abrir ajustes"
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-right font-mono text-[11px] text-dim active:bg-raised"
        >
          <span>
            {user.name ? `${user.name} · ` : ""}
            {user.weightKg} kg · {user.heightCm} cm
            <br />
            GET ×{user.activityFactor}
          </span>
          <SyncDot />
          <svg viewBox="0 0 24 24" className="size-5 text-text" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </header>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="grid gap-4"
      >
        {tab === "today" && plan.meals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center">
            <p className="text-base font-semibold">Sua dieta ainda está vazia</p>
            <p className="mt-1 mb-4 text-sm text-dim">
              Monte as refeições e os alimentos para acompanhar calorias e macros.
            </p>
            <button
              onClick={() => {
                setSettingsTab("diet");
                setTab("settings");
              }}
              className="rounded-xl bg-neon px-5 py-3 font-mono text-sm font-bold text-bg active:opacity-80"
            >
              Montar minha dieta
            </button>
          </div>
        )}

        {tab === "today" && (
          <>
            {plan.meals.length > 0 && (
              <EnergyPanel consumed={consumed} planned={planned} bmr={bmr} get={get} />
            )}
            <HydrationTracker
              ml={log?.waterMl ?? 0}
              goalMl={user.waterGoalMl}
              onAdd={(d) => addWater(todayKey, d)}
              onSet={(ml) => setWater(todayKey, ml)}
            />
            {plan.meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                foods={foods}
                checked={checked}
                isNext={meal.id === nextMealId}
                onToggle={(id) => toggleItem(todayKey, id)}
              />
            ))}
          </>
        )}

        {tab === "settings" && (
          <Settings tab={settingsTab} onTab={setSettingsTab} onBack={() => setTab("today")} />
        )}

        {tab === "shopping" && <ShoppingList plan={plan} foods={foods} />}

        {tab === "weight" && (
          <WeightPanel
            user={user}
            logs={logs}
            bmr={bmr}
            todayKey={todayKey}
            today={today}
            onSave={(kg) => setWeight(todayKey, kg)}
            onApplyFactor={(f) => updateUser({ activityFactor: f })}
          />
        )}

        {tab === "week" && (
          <WeekChart
            points={week.points}
            get={get}
            closedBalance={week.closedBalance}
            todayBalance={week.todayBalance}
          />
        )}
      </motion.div>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id}
              className={`rounded-xl py-3 font-mono text-xs tracking-widest uppercase transition-colors ${
                tab === t.id ? "bg-neon text-bg font-bold" : "text-dim active:bg-raised"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
    </MotionConfig>
  );
}
