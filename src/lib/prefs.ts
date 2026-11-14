"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Preferências só deste aparelho (não vão para o backup nem para a nuvem). */
export interface Prefs {
  /** Escolheu "usar sem conta": não mostra mais a tela de boas-vindas. */
  guest: boolean;
  remindMeals: boolean;
  remindWater: boolean;
  remindWeight: boolean;
  /** minutos de antecedência do aviso de refeição */
  leadMin: number;
  quiet: boolean;
  set: (p: Partial<Omit<Prefs, "set">>) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      guest: false,
      remindMeals: false,
      remindWater: false,
      remindWeight: false,
      leadMin: 10,
      quiet: true,
      set: (p) => set(p),
    }),
    { name: "fuel-prefs" },
  ),
);

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export async function askNotificationPermission(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "default";
  }
}
