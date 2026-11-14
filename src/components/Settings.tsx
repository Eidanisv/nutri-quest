"use client";

import { DataTools } from "./DataTools";
import { DietEditor } from "./DietEditor";
import { FoodCatalog } from "./Foods";
import { ProfileForm } from "./ProfileForm";

export type SettingsTab = "profile" | "diet" | "foods" | "data";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "profile", label: "Perfil" },
  { id: "diet", label: "Dieta" },
  { id: "foods", label: "Alimentos" },
  { id: "data", label: "Conta" },
];

export function Settings({
  tab,
  onTab,
  onBack,
}: {
  tab: SettingsTab;
  onTab: (t: SettingsTab) => void;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-xl border border-line px-3 py-2 font-mono text-xs text-dim active:bg-raised"
        >
          ← Voltar
        </button>
        <h2 className="text-base font-semibold">Ajustes</h2>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`rounded-xl py-2 font-mono text-[11px] tracking-wider uppercase ${
              tab === t.id ? "bg-raised text-neon" : "text-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileForm />}
      {tab === "diet" && <DietEditor />}
      {tab === "foods" && <FoodCatalog />}
      {tab === "data" && <DataTools />}
    </div>
  );
}
