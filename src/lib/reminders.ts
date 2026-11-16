"use client";

import { useEffect } from "react";
import { fmt, toDateKey } from "./calc";
import { notificationsSupported, usePrefs } from "./prefs";
import { useStore } from "./store";

const KEY = "fuel-fired";

function firedSet(day: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as { day?: string; keys?: string[] };
    return raw.day === day ? new Set(raw.keys) : new Set();
  } catch {
    return new Set();
  }
}
function remember(day: string, set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day, keys: [...set] }));
  } catch {
    /* sem armazenamento: o aviso pode repetir, sem prejuízo */
  }
}
function notify(title: string, body: string) {
  try {
    new Notification(title, { body, icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icon-192.png` });
  } catch {
    /* alguns navegadores móveis só aceitam via service worker */
  }
}

/**
 * Lembretes locais: enquanto o app está aberto (ou instalado), confere a cada
 * 30 s se é hora de avisar. Não há servidor de push, então com o app fechado
 * não chega aviso.
 */
export function useReminders(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !notificationsSupported()) return;
    const tick = () => {
      if (Notification.permission !== "granted") return;
      const p = usePrefs.getState();
      if (!p.remindMeals && !p.remindWater && !p.remindWeight) return;
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      if (p.quiet && (mins >= 22 * 60 || mins < 7 * 60)) return;
      const day = toDateKey(now);
      const fired = firedSet(day);
      const s = useStore.getState();
      const log = s.logs[day];
      const checked = new Set([...(log?.checkedItemIds ?? []), ...(log?.skippedItemIds ?? [])]);
      let changed = false;
      const once = (k: string, title: string, body: string) => {
        if (fired.has(k)) return;
        fired.add(k);
        changed = true;
        notify(title, body);
      };

      if (p.remindMeals)
        for (const m of s.plan.meals) {
          const [h, mm] = m.time.split(":").map(Number);
          const t = h * 60 + mm;
          if (mins >= t - p.leadMin && mins < t + 20 && m.items.some((i) => !checked.has(i.id)))
            once(`m:${m.id}`, m.name, p.leadMin > 0 && mins < t ? `Daqui a pouco, às ${m.time}.` : `É hora da refeição (${m.time}).`);
        }

      const hour = now.getHours();
      if (p.remindWater && hour >= 8 && hour <= 20 && hour % 2 === 0 && now.getMinutes() < 30) {
        const ml = log?.waterMl ?? 0;
        if (ml < s.user.waterGoalMl) once(`w:${hour}`, "Hora de beber água", `${fmt(ml / 1000, 2)} de ${fmt(s.user.waterGoalMl / 1000, 1)} L hoje.`);
      }

      const dow = now.getDay();
      if (p.remindWeight && [1, 3, 5].includes(dow) && hour >= 7 && hour < 11 && log?.weightKg === undefined)
        once("p", "Hora de pesar", "De manhã, em jejum, antes de comer.");

      if (changed) remember(day, fired);
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [enabled]);
}
