"use client";

import { create } from "zustand";

export type Tab = "today" | "shopping" | "week" | "weight" | "profile";

/** Telas empilhadas por cima da aba atual (com botão Voltar). */
export type Screen =
  | { id: "meal"; mealId: string }
  | { id: "meal-edit"; mealId: string }
  | { id: "calibration" }
  | { id: "profile-edit" }
  | { id: "activity" }
  | { id: "diet" }
  | { id: "foods" }
  | { id: "reminders" }
  | { id: "account" }
  | { id: "data" }
  | { id: "about" };

export type SheetKey = "water" | "weight" | null;

interface Nav {
  tab: Tab;
  stack: Screen[];
  sheet: SheetKey;
  setTab: (t: Tab) => void;
  push: (s: Screen) => void;
  pop: () => void;
  reset: () => void;
  openSheet: (s: SheetKey) => void;
}

/**
 * Navegação própria (o app é uma página só, exportada como site estático).
 * O botão Voltar do navegador/celular desempilha a tela em vez de sair do app.
 */
export const useNav = create<Nav>()((set, get) => ({
  tab: "today",
  stack: [],
  sheet: null,
  setTab: (tab) => set({ tab, stack: [], sheet: null }),
  push: (s) => {
    if (typeof history !== "undefined") history.pushState({ fuel: get().stack.length + 1 }, "");
    set((st) => ({ stack: [...st.stack, s], sheet: null }));
  },
  pop: () => {
    if (!get().stack.length) return;
    // history.back() dispara o popstate, que desempilha; sem histórico, desempilha direto.
    if (typeof history !== "undefined" && history.state?.fuel) history.back();
    else set((st) => ({ stack: st.stack.slice(0, -1) }));
  },
  reset: () => set({ tab: "today", stack: [], sheet: null }),
  openSheet: (sheet) => set({ sheet }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const { stack } = useNav.getState();
    if (stack.length) useNav.setState({ stack: stack.slice(0, -1), sheet: null });
  });
}
