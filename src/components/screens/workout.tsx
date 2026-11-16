"use client";

import { useState } from "react";
import { WORKOUT_LABEL, fmt, scoreLabel, scoreTone, workoutKcal } from "@/lib/calc";
import { calcDayBase } from "@/lib/calc";
import { useDay } from "@/lib/derived";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { useStore } from "@/lib/store";
import type { Workout } from "@/lib/types";
import { Banner, Button, Card, Choice, Icon, Progress, Sheet } from "../kit";

const f1 = (n: number) => String(n.toFixed(1)).replace(".", ",");

/** Nota da dieta do dia (1 a 10), calculada a partir do que foi marcado. */
export function ScoreCard({ score }: { score: number | null }) {
  const tone = score === null ? null : scoreTone(score);
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "err" ? "text-err" : "text-tx2";
  return (
    <Card className="grid gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="t-cap-sb tracking-wide text-tx2 uppercase">Nota da dieta hoje</p>
          <p className="t-t28 tnum">
            {score === null ? "—" : <span className={color}>{f1(score)}</span>} <span className="t-body font-normal text-tx2">de 10</span>
          </p>
        </div>
        <span className={`t-small-sb ${color}`}>{score === null ? "Sem marcação" : scoreLabel(score)}</span>
      </div>
      <Progress value={score === null ? 0 : (score - 1) / 9} tone={tone === "err" ? "err" : tone === "ok" ? "ok" : "blue"} h={6} label="Nota da dieta" />
      <p className="t-cap text-tx2">
        {score === null
          ? "Marque o que você comeu e a nota aparece. 10 é comer tudo o que está no plano."
          : "Calculada pelo que você marcou: metade vem das calorias comidas e metade dos itens do plano."}
      </p>
    </Card>
  );
}

/** Treino do dia: marcar e ver o gasto total. */
export function WorkoutCard() {
  const d = useDay();
  const openSheet = useNav((s) => s.openSheet);
  const w = d.workout;
  return (
    <Card className="grid gap-3">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${w ? "bg-blue/10 text-blue" : "bg-sup text-tx2"}`}>
          <Icon name="dumb" size={22} sw={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-body-sb">Treino de hoje</p>
          <p className="t-small text-tx2">{w ? `${WORKOUT_LABEL[w]} · ≈ ${fmt(d.trainKcal)} kcal` : "Ainda não marcado"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="t-small text-tx2">Gasto do dia</p>
          <p className="t-cap text-tx2">
            {fmt(d.baseGet)} base{w ? ` + ${fmt(d.trainKcal)} treino` : ""}
          </p>
        </div>
        <p className="t-body-sb tnum">{fmt(d.get)} kcal</p>
      </div>
      <Button size="md" variant={w ? "outline" : "primary"} onClick={() => openSheet("workout")}>
        {w ? "Alterar treino" : "Marcar treino"}
      </Button>
    </Card>
  );
}

function WorkoutForm({ date }: { date: string }) {
  const d = useDay();
  const log = useStore((s) => s.logs[date]);
  const setWorkout = useStore((s) => s.setWorkout);
  const openSheet = useNav((s) => s.openSheet);
  const [draft, setDraft] = useState<Workout | "none">(log?.workout ?? "none");
  const base = calcDayBase(d.user);
  const kg = d.user.weightKg;
  const kc = (w: Workout) => workoutKcal(w, kg);
  const total = base + (draft === "none" ? 0 : kc(draft));

  return (
    <div className="grid gap-4">
      <div className="grid gap-2.5" role="radiogroup" aria-label="Treino do dia">
        <Choice title="Não treinei" desc="O gasto do dia fica só com o dia a dia" selected={draft === "none"} onClick={() => setDraft("none")} />
        <Choice title="Só musculação" desc={`Cerca de 1 hora · ≈ ${fmt(kc("weights"))} kcal`} selected={draft === "weights"} onClick={() => setDraft("weights")} />
        <Choice title="Musculação + cardio" desc={`Cardio de 30 a 40 min · ≈ ${fmt(kc("weights_cardio"))} kcal`} selected={draft === "weights_cardio"} onClick={() => setDraft("weights_cardio")} />
      </div>
      <Banner>
        Gasto do dia: <b>{fmt(total)} kcal</b> ({fmt(base)} do dia a dia{draft === "none" ? "" : ` + ${fmt(kc(draft))} do treino`}). As kcal do treino são estimadas a partir do seu peso ({fmt(kg, 1)} kg).
      </Banner>
      <Button
        onClick={() => {
          haptic(12);
          setWorkout(date, draft === "none" ? null : draft);
          openSheet(null);
        }}
      >
        Salvar
      </Button>
    </div>
  );
}

export function WorkoutSheet() {
  const sheet = useNav((s) => s.sheet);
  const sheetDate = useNav((s) => s.sheetDate);
  const openSheet = useNav((s) => s.openSheet);
  const d = useDay();
  const date = sheetDate ?? d.todayKey;
  const [, m, dd] = date.split("-");
  return (
    <Sheet open={sheet === "workout"} title={date === d.todayKey ? "Treino de hoje" : `Treino de ${dd}/${m}`} onClose={() => openSheet(null)}>
      <WorkoutForm key={date} date={date} />
    </Sheet>
  );
}
