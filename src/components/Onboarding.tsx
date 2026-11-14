"use client";

import { ImportButton } from "./DataTools";
import { ProfileForm } from "./ProfileForm";
import { btnPrimary } from "./ui";

export function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-8 pb-12">
      <h1 className="font-mono text-xl font-bold tracking-[0.25em]">
        FUEL<span className="text-neon">_</span>
      </h1>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight">Vamos começar</h2>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-dim">
        Conte um pouco sobre você para calcular seu gasto diário. Depois você monta a dieta. Tudo
        pode ser mudado em Ajustes.
      </p>

      <ProfileForm />

      <div className="mt-5 grid gap-3">
        <button onClick={onDone} className={btnPrimary}>
          Continuar: montar minha dieta
        </button>
        {/* o backup já marca o perfil como concluído: o app abre direto na tela Hoje */}
        <ImportButton label="Já tenho um backup (.json)" confirmReplace={false} />
      </div>
    </main>
  );
}
