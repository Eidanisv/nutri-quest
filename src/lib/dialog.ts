"use client";

import { create } from "zustand";

export interface DialogOpts {
  title: string;
  message: string;
  /** Botões, de cima para baixo. O último costuma ser "Cancelar". */
  actions: { label: string; value: string; tone?: "danger"; strong?: boolean }[];
}

interface DialogState {
  open: (DialogOpts & { resolve: (v: string | null) => void }) | null;
  ask: (o: DialogOpts) => Promise<string | null>;
  close: (v: string | null) => void;
}

/** Alerta no estilo iOS, no lugar do window.confirm. `await ask(...)` devolve o `value` tocado. */
export const useDialog = create<DialogState>()((set, get) => ({
  open: null,
  ask: (o) =>
    new Promise((resolve) => {
      set({ open: { ...o, resolve } });
    }),
  close: (v) => {
    get().open?.resolve(v);
    set({ open: null });
  },
}));

export const confirmDanger = async (title: string, message: string, label: string) =>
  (await useDialog.getState().ask({
    title,
    message,
    actions: [
      { label, value: "ok", tone: "danger", strong: true },
      { label: "Cancelar", value: "cancel" },
    ],
  })) === "ok";
