"use client";

import { calcBmr, calcGet, fmt } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { ACTIVITY_FACTORS, type ActivityLevel } from "@/lib/types";
import { Card, Field, NumInput, inputCls } from "./ui";

const LEVELS: { id: ActivityLevel; title: string; desc: string }[] = [
  { id: "sedentary", title: "Sedentário", desc: "Pouco ou nenhum exercício" },
  { id: "light", title: "Leve", desc: "Treino leve 1–3×/semana" },
  { id: "moderate", title: "Moderado", desc: "Treino 3–5×/semana" },
  { id: "high", title: "Alto", desc: "Treino pesado 6–7×/semana" },
  { id: "very_high", title: "Muito alto", desc: "Treino pesado + trabalho físico, ou 2×/dia" },
];

export function ProfileForm() {
  const user = useStore((s) => s.user);
  const update = useStore((s) => s.updateUser);

  const bmr = calcBmr(user);
  const get = calcGet(user);

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <Field label="Nome (opcional)">
          <input
            value={user.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Como quer ser chamado"
            className={inputCls}
          />
        </Field>

        <div>
          <span className="mb-1 block font-mono text-[11px] tracking-wider text-dim uppercase">
            Sexo
          </span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sexo">
            {(["male", "female"] as const).map((sx) => (
              <button
                key={sx}
                role="radio"
                aria-checked={user.sex === sx}
                onClick={() => update({ sex: sx })}
                className={`rounded-xl border py-2.5 text-sm ${
                  user.sex === sx ? "border-neon bg-neon/10 text-neon" : "border-line text-dim"
                }`}
              >
                {sx === "male" ? "Masculino" : "Feminino"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Idade">
            <NumInput value={user.age} onCommit={(n) => n && update({ age: n })} min={14} max={100} decimals={0} unit="anos" />
          </Field>
          <Field label="Peso">
            <NumInput value={user.weightKg} onCommit={(n) => n && update({ weightKg: n })} min={30} max={300} unit="kg" />
          </Field>
          <Field label="Altura">
            <NumInput value={user.heightCm} onCommit={(n) => n && update({ heightCm: n })} min={100} max={250} decimals={0} unit="cm" />
          </Field>
          <Field label="% gordura" hint="Opcional">
            <NumInput
              value={user.bodyFatPct}
              onCommit={(n) =>
                update({
                  bodyFatPct: n ?? undefined,
                  leanMassKg: n === null ? undefined : Math.round(user.weightKg * (1 - n / 100) * 100) / 100,
                })
              }
              allowEmpty
              min={3}
              max={60}
              unit="%"
              placeholder="—"
            />
          </Field>
        </div>

        <Field label="Meta de água" hint="Exemplo: 35 ml por kg de peso">
          <NumInput value={user.waterGoalMl} onCommit={(n) => n && update({ waterGoalMl: Math.round(n) })} min={500} max={10000} decimals={0} unit="ml" />
        </Field>
      </Card>

      <Card className="grid gap-3">
        <div>
          <p className="text-sm font-semibold">Nível de atividade</p>
          <p className="text-xs text-dim">
            Considere o dia todo, não só o treino. Trabalha sentado? Escolha um nível abaixo do que
            o treino sugere. A aba Peso calibra isso depois, com o seu peso real.
          </p>
        </div>
        <div className="grid gap-2" role="radiogroup" aria-label="Nível de atividade">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={user.activityLevel === l.id}
              onClick={() => update({ activityLevel: l.id, activityFactor: ACTIVITY_FACTORS[l.id] })}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                user.activityLevel === l.id ? "border-neon bg-neon/10" : "border-line"
              }`}
            >
              <span>
                <span className="block text-sm">{l.title}</span>
                <span className="text-[11px] text-dim">{l.desc}</span>
              </span>
              <span className="font-mono text-xs text-dim">×{ACTIVITY_FACTORS[l.id]}</span>
            </button>
          ))}
        </div>
        <Field label="Fator exato" hint="Ajuste fino, se você já conhece o seu.">
          <NumInput value={user.activityFactor} onCommit={(n) => n && update({ activityFactor: n })} min={1.1} max={2.5} decimals={2} />
        </Field>
      </Card>

      <Card className="border-neon/30">
        <p className="font-mono text-[11px] tracking-widest text-dim uppercase">Seu gasto estimado</p>
        <p className="mt-1 font-mono text-3xl font-semibold">
          {fmt(get)} <span className="text-sm font-normal text-dim">kcal/dia (GET)</span>
        </p>
        <p className="mt-1 text-xs text-dim">
          TMB {fmt(bmr)} kcal (Mifflin-St Jeor) × {fmt(user.activityFactor, 2)}. É uma estimativa:
          ela melhora quando você registra o peso por algumas semanas.
        </p>
      </Card>
    </div>
  );
}
