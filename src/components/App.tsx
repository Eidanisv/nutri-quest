"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useDialog } from "@/lib/dialog";
import { useNav, type Screen, type Tab } from "@/lib/nav";
import { usePrefs } from "@/lib/prefs";
import { useReminders } from "@/lib/reminders";
import { useHydrated, useStore } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { DialogHost, Icon, Skeleton, type IconName } from "./kit";
import { AccountScreen, DataScreen } from "./screens/account";
import { AuthFlow } from "./screens/auth";
import { DietScreen, FoodsScreen, MealEditScreen } from "./screens/diet";
import { Onboarding } from "./screens/onboarding";
import { AboutScreen, ActivityScreen, ProfileEditScreen, ProfileScreen, RemindersScreen } from "./screens/profile";
import { ShoppingScreen } from "./screens/shopping";
import { DietTabScreen, MealDetailScreen, TodayScreen, WaterSheet } from "./screens/today";
import { CalibrationScreen, WeightScreen, WeightSheet } from "./screens/weight";
import { SwapSheet } from "./screens/swap";
import { WorkoutSheet } from "./screens/workout";
import { WeekScreen } from "./screens/week";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "today", label: "Hoje", icon: "home" },
  { id: "diet", label: "Dieta", icon: "utensils" },
  { id: "shopping", label: "Compras", icon: "bag" },
  { id: "week", label: "Semana", icon: "chart" },
  { id: "weight", label: "Peso", icon: "trend" },
  { id: "profile", label: "Perfil", icon: "user" },
];

function TabBar() {
  const { tab, setTab } = useNav();
  return (
    <nav aria-label="Abas" className="material fixed inset-x-0 bottom-0 z-20 border-t border-bd pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md px-1 pt-2 pb-1.5">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={on ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-0.5 py-1 ${on ? "text-blue" : "text-tx2"}`}>
              <Icon name={t.icon} size={24} />
              <span className={on ? "t-cap-sb" : "t-cap"}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TabScreen({ tab }: { tab: Tab }) {
  switch (tab) {
    case "today":
      return <TodayScreen />;
    case "diet":
      return <DietTabScreen />;
    case "shopping":
      return <ShoppingScreen />;
    case "week":
      return <WeekScreen />;
    case "weight":
      return <WeightScreen />;
    case "profile":
      return <ProfileScreen />;
  }
}

function StackScreen({ s }: { s: Screen }) {
  switch (s.id) {
    case "meal":
      return <MealDetailScreen mealId={s.mealId} />;
    case "meal-edit":
      return <MealEditScreen mealId={s.mealId} />;
    case "calibration":
      return <CalibrationScreen />;
    case "profile-edit":
      return <ProfileEditScreen />;
    case "activity":
      return <ActivityScreen />;
    case "diet":
      return <DietScreen />;
    case "foods":
      return <FoodsScreen />;
    case "reminders":
      return <RemindersScreen />;
    case "account":
      return <AccountScreen />;
    case "data":
      return <DataScreen />;
    case "about":
      return <AboutScreen />;
  }
}

function Loading() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-start gap-4 px-4 pt-6" aria-busy aria-label="Carregando">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-4 w-52" />
      <Skeleton className="h-52 w-full !rounded-xl" />
      <Skeleton className="h-24 w-full !rounded-xl" />
      <Skeleton className="h-20 w-full !rounded-xl" />
    </main>
  );
}

function Shell() {
  const { tab, stack } = useNav();
  const top = stack.at(-1);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, top]);

  return (
    <>
      {top ? <StackScreen s={top} /> : <TabScreen tab={tab} />}
      {!top && <TabBar />}
      <WaterSheet />
      <WeightSheet />
      <WorkoutSheet />
      <SwapSheet />
    </>
  );
}

export function App() {
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.user.onboarded);
  const status = useSync((s) => s.status);
  const email = useSync((s) => s.email);
  const recovering = useSync((s) => s.recovering);
  const guest = usePrefs((s) => s.guest);
  const reminders = usePrefs((s) => s.remindMeals || s.remindWater || s.remindWeight);

  // liga a sincronização (se houver chaves do Supabase) depois que o estado local carregou
  useEffect(() => {
    if (hydrated) useSync.getState().init();
  }, [hydrated]);

  useReminders(hydrated && Boolean(onboarded) && reminders);

  // conta com dados nos dois lados: pergunta qual manter (a escolha também fica em Perfil › Conta)
  useEffect(() => {
    if (status !== "conflict") return;
    void useDialog
      .getState()
      .ask({
        title: "Dados diferentes na nuvem e neste aparelho",
        message: `A conta ${email ?? ""} já tem dados, e este aparelho também. Qual versão você quer manter?`,
        actions: [
          { label: "Usar os dados da nuvem", value: "cloud" },
          { label: "Usar os deste aparelho", value: "device", strong: true },
          { label: "Decidir depois", value: "later" },
        ],
      })
      .then((v) => {
        if (v === "cloud" || v === "device") void useSync.getState().resolveConflict(v);
      });
  }, [status, email]);

  // A tela de carregamento só vale para a primeira busca da conta. Sincronizações
  // seguintes (a cada edição) não podem desmontar o onboarding e zerar o que a pessoa digitou.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (status === "idle" || status === "error" || status === "conflict" || status === "unconfigured") setSettled(true);
    else if (status === "signed-out") setSettled(false);
  }, [status]);

  let content;
  if (!hydrated) content = <Loading />;
  else if (recovering) content = <AuthFlow initial="newpass" />;
  else if (!onboarded) {
    if (status === "syncing" && !settled) content = <Loading />; // buscando os dados da conta
    else if (status === "signed-out" && !guest) content = <AuthFlow />;
    else content = <Onboarding />;
  } else content = <Shell />;

  return (
    <MotionConfig reducedMotion="user">
      {content}
      <DialogHost />
    </MotionConfig>
  );
}
