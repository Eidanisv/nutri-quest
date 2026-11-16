import {
  EMPTY_MACROS,
  type DailyLog,
  type FoodCategory,
  type FoodItem,
  type Macros,
  type MealPlan,
  type Swap,
  type User,
  type Workout,
} from "./types";

// ───────────── Motor metabólico ─────────────

/** Taxa Metabólica Basal (kcal/dia). */
export function calcBmr(u: User): number {
  if (u.bmrFormula === "harris") {
    // Harris-Benedict revisada (Roza & Shizgal, 1984)
    return u.sex === "male"
      ? 88.362 + 13.397 * u.weightKg + 4.799 * u.heightCm - 5.677 * u.age
      : 447.593 + 9.247 * u.weightKg + 3.098 * u.heightCm - 4.33 * u.age;
  }
  // Mifflin-St Jeor (1990) — padrão
  const base = 10 * u.weightKg + 6.25 * u.heightCm - 5 * u.age;
  return base + (u.sex === "male" ? 5 : -161);
}

/** Gasto Energético Total (kcal/dia) = TMB × fator de atividade. */
export function calcGet(u: User): number {
  return calcBmr(u) * u.activityFactor;
}

/**
 * Gasto do dia a dia SEM treino. O fator de atividade que a pessoa escolheu já inclui o
 * treino médio da semana; aqui tiramos essa parte (0,2) e a devolvemos só nos dias em que
 * ela treinou. Nunca abaixo de 1,2 (sedentário).
 */
export const TRAINING_SHARE = 0.2;
export const baseFactor = (u: User): number => Math.max(1.2, u.activityFactor - TRAINING_SHARE);

/** kcal extras do treino (acima do repouso), proporcionais ao peso: musculação ≈ 4,0 × kg; com cardio de ~35 min ≈ 7,5 × kg. */
export const WORKOUT_KCAL_PER_KG: Record<Workout, number> = { weights: 4, weights_cardio: 7.5 };
export const WORKOUT_LABEL: Record<Workout, string> = { weights: "Só musculação", weights_cardio: "Musculação + cardio" };
export const workoutKcal = (w: Workout | undefined | null, weightKg: number): number =>
  w ? Math.round(weightKg * WORKOUT_KCAL_PER_KG[w]) : 0;

/** Gasto total do dia = TMB × fator do dia a dia + kcal do treino marcado. */
export const calcDayBase = (u: User): number => calcBmr(u) * baseFactor(u);
export const calcDayGet = (u: User, w: Workout | undefined | null): number => calcDayBase(u) + workoutKcal(w, u.weightKg);

// ───────────── Nota da dieta (1 a 10) ─────────────

/**
 * 10 = comeu tudo o que está previsto; 1 = não fez a dieta.
 * Metade da nota vem das calorias comidas (pular o arroz pesa mais que pular a salada) e
 * metade de quantos itens foram comidos. Item "não comi" ou sem marcação não conta como comido.
 * Item trocado por outra coisa conta como comido (calorias até o previsto).
 * `nowMins`: para o dia de hoje, só entram refeições que já passaram do horário (ou que já têm marcação).
 * Devolve null enquanto nada foi marcado (sem registro).
 */
export function dietScore(
  plan: MealPlan,
  foods: FoodMap,
  checkedIds: string[] | undefined,
  skippedIds: string[] | undefined,
  nowMins?: number,
  swaps?: Record<string, Swap>,
): number | null {
  const checked = new Set(checkedIds ?? []);
  const decided = new Set([...(checkedIds ?? []), ...(skippedIds ?? [])]);
  let kPlan = 0, kEat = 0, nPlan = 0, nEat = 0, any = false;
  for (const m of plan.meals) {
    const [h, mm] = m.time.split(":").map(Number);
    const started = nowMins === undefined || h * 60 + mm <= nowMins;
    const touched = m.items.some((i) => decided.has(i.id));
    if (!started && !touched) continue;
    for (const i of m.items) {
      const f = foods[i.foodId];
      if (!f) continue;
      const k = macrosOf(f, i.quantity).kcal;
      kPlan += k;
      nPlan += 1;
      if (decided.has(i.id)) any = true;
      if (checked.has(i.id)) {
        // item trocado: o item conta inteiro; as calorias contam até o que estava previsto
        const sw = swaps?.[i.id];
        kEat += sw ? (k > 0 ? Math.min(k, sw.macros.kcal) : k) : k;
        nEat += 1;
      }
    }
  }
  if (!any || nPlan === 0) return null;
  const share = 0.5 * (kPlan > 0 ? kEat / kPlan : nEat / nPlan) + 0.5 * (nEat / nPlan);
  return Math.round((1 + 9 * share) * 10) / 10;
}

export const scoreTone = (s: number): "ok" | "warn" | "err" => (s >= 8 ? "ok" : s >= 5 ? "warn" : "err");
export const scoreLabel = (s: number): string =>
  s >= 9.5 ? "Dieta perfeita" : s >= 8 ? "Muito bem" : s >= 6.5 ? "Bom, dá para melhorar" : s >= 5 ? "Regular" : "Fraco";

// ───────────── Macros ─────────────

export function macrosOf(food: FoodItem, quantity: number): Macros {
  const k = quantity / food.baseAmount;
  return {
    kcal: food.macros.kcal * k,
    protein: food.macros.protein * k,
    carbs: food.macros.carbs * k,
    fat: food.macros.fat * k,
    fiber: food.macros.fiber * k,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
      fiber: a.fiber + m.fiber,
    }),
    { ...EMPTY_MACROS },
  );
}

export type FoodMap = Record<string, FoodItem>;

export function planTotals(plan: MealPlan, foods: FoodMap): Macros {
  return sumMacros(
    plan.meals.flatMap((m) =>
      m.items.filter((i) => foods[i.foodId]).map((i) => macrosOf(foods[i.foodId], i.quantity)),
    ),
  );
}

export function consumedTotals(
  plan: MealPlan,
  foods: FoodMap,
  checked: string[],
  swaps?: Record<string, Swap>,
): Macros {
  const set = new Set(checked);
  return sumMacros(
    plan.meals.flatMap((m) =>
      m.items
        .filter((i) => set.has(i.id) && (swaps?.[i.id] || foods[i.foodId]))
        .map((i) => swaps?.[i.id]?.macros ?? macrosOf(foods[i.foodId], i.quantity)),
    ),
  );
}

// ───────────── Datas (sempre locais, nunca UTC) ─────────────

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Segunda-feira da semana de `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // seg=0 … dom=6
  x.setDate(x.getDate() - dow);
  return x;
}

export function weekDays(d: Date): Date[] {
  const s = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(s);
    x.setDate(s.getDate() + i);
    return x;
  });
}

// ───────────── Semana ─────────────

export interface WeekPoint {
  date: string;
  label: string;
  consumed: number | null; // null = sem registro
  get: number;
  isToday: boolean;
  workout?: Workout;
  score: number | null;
}

const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function buildWeek(
  logs: Record<string, DailyLog>,
  currentGet: number,
  today: Date,
): { points: WeekPoint[]; closedBalance: number; todayBalance: number } {
  const todayKey = toDateKey(today);
  let closed = 0;
  let todayBal = 0;
  const points = weekDays(today).map((d, i) => {
    const key = toDateKey(d);
    const log = logs[key];
    const get = log?.getKcal ?? currentGet;
    const consumed = log && log.consumed.kcal > 0 ? log.consumed.kcal : null;
    if (consumed !== null) {
      // saldo > 0 = déficit (gastou mais do que comeu)
      if (key < todayKey) closed += get - consumed;
      else if (key === todayKey) todayBal = get - consumed;
    }
    return { date: key, label: DOW[i], consumed, get, isToday: key === todayKey, workout: log?.workout, score: log?.score ?? null };
  });
  return { points, closedBalance: closed, todayBalance: todayBal };
}

// ───────────── Lista de compras ─────────────

export interface ShoppingLine {
  foodId: string;
  name: string;
  category: FoodCategory;
  unit: FoodItem["unit"];
  weekly: number;
}

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  proteins: "Proteínas",
  produce: "Hortifruti",
  carbs: "Carboidratos",
  dairy: "Laticínios",
  fats: "Gorduras",
  supplements: "Suplementos",
  others: "Outros",
};

export const CATEGORY_ORDER: FoodCategory[] = [
  "proteins",
  "produce",
  "carbs",
  "dairy",
  "fats",
  "supplements",
  "others",
];

/** Soma o plano diário por alimento e multiplica por `days` (7). */
export function buildShoppingList(
  plan: MealPlan,
  foods: FoodMap,
  days = 7,
): Record<FoodCategory, ShoppingLine[]> {
  const acc = new Map<string, number>();
  for (const meal of plan.meals)
    for (const it of meal.items)
      acc.set(it.foodId, (acc.get(it.foodId) ?? 0) + it.quantity);

  const out = {} as Record<FoodCategory, ShoppingLine[]>;
  for (const c of CATEGORY_ORDER) out[c] = [];
  for (const [foodId, daily] of acc) {
    const f = foods[foodId];
    if (!f) continue;
    out[f.category].push({
      foodId,
      name: f.name,
      category: f.category,
      unit: f.unit,
      weekly: daily * days,
    });
  }
  for (const c of CATEGORY_ORDER)
    out[c].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return out;
}

export function formatQty(q: number, unit: FoodItem["unit"]): string {
  if (unit === "un") return `${Math.round(q)} un`;
  if (q >= 1000)
    return `${(q / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit === "g" ? "kg" : "L"}`;
  return `${Math.round(q)} ${unit}`;
}

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// ───────────── Peso e calibração do GET ─────────────

/** kcal por kg de peso corporal perdido/ganho (aproximação clássica). */
export const KCAL_PER_KG = 7700;

export interface WeightPoint {
  date: string;
  kg: number;
  /** Média móvel dos últimos 7 dias (inclui o próprio dia). */
  avg7: number;
}

const dayNumber = (key: string): number => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(new Date(y, m - 1, d).getTime() / 86_400_000);
};

export function weightSeries(logs: Record<string, DailyLog>): WeightPoint[] {
  const raw = Object.values(logs)
    .filter((l) => l.weightKg !== undefined)
    .map((l) => ({ date: l.date, kg: l.weightKg as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return raw.map((p) => {
    const n = dayNumber(p.date);
    const win = raw.filter((q) => {
      const dn = dayNumber(q.date);
      return dn <= n && dn > n - 7;
    });
    return { ...p, avg7: win.reduce((a, q) => a + q.kg, 0) / win.length };
  });
}

export type Calibration =
  | { ok: false; reason: string }
  | {
      ok: true;
      observedGet: number;
      factor: number;
      avgIntake: number;
      slopeKgWeek: number;
      days: number;
      weighIns: number;
    };

/**
 * GET observado = ingestão média − (variação diária de peso × 7700).
 * A inclinação vem de regressão linear das pesagens (resiste a ruído de água).
 * Só estima com dados suficientes; caso contrário diz o que falta.
 */
export function calibrate(
  logs: Record<string, DailyLog>,
  bmr: number,
  today: Date,
): Calibration {
  const todayN = dayNumber(toDateKey(today));
  const pts = weightSeries(logs).filter((p) => dayNumber(p.date) > todayN - 28);
  if (pts.length < 4)
    return { ok: false, reason: `Faltam pesagens: ${pts.length}/4 nos últimos 28 dias.` };

  const first = dayNumber(pts[0].date);
  const last = dayNumber(pts[pts.length - 1].date);
  const days = last - first + 1;
  if (days < 14)
    return { ok: false, reason: `Janela curta: ${days}/14 dias entre a primeira e a última pesagem.` };

  const intakeDays = Object.values(logs).filter((l) => {
    const n = dayNumber(l.date);
    return n >= first && n <= last && l.consumed.kcal > 0;
  });
  const coverage = intakeDays.length / days;
  if (coverage < 0.7)
    return {
      ok: false,
      reason: `Faltam registros de refeição: ${intakeDays.length}/${days} dias (precisa de 70%).`,
    };

  const xs = pts.map((p) => dayNumber(p.date) - first);
  const ys = pts.map((p) => p.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope =
    xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
    xs.reduce((a, x) => a + (x - mx) ** 2, 0); // kg/dia

  const avgIntake =
    intakeDays.reduce((a, l) => a + l.consumed.kcal, 0) / intakeDays.length;
  const observedGet = avgIntake - slope * KCAL_PER_KG;
  return {
    ok: true,
    observedGet,
    factor: observedGet / bmr,
    avgIntake,
    slopeKgWeek: slope * 7,
    days,
    weighIns: pts.length,
  };
}

// ───────────── Progresso da calibração (para a tela explicar o que falta) ─────────────

export interface CalibrationProgress {
  weighIns: number; // pesagens nos últimos 28 dias
  days: number; // dias entre a primeira e a última pesagem
  coveragePct: number; // % de dias com refeição marcada nessa janela
  needWeighIns: 4;
  needDays: 14;
  needCoveragePct: 70;
}

export function calibrationProgress(
  logs: Record<string, DailyLog>,
  today: Date,
): CalibrationProgress {
  const todayN = dayNumber(toDateKey(today));
  const pts = weightSeries(logs).filter((p) => dayNumber(p.date) > todayN - 28);
  const first = pts.length ? dayNumber(pts[0].date) : todayN;
  const last = pts.length ? dayNumber(pts[pts.length - 1].date) : todayN;
  const days = pts.length ? last - first + 1 : 0;
  const intake = Object.values(logs).filter((l) => {
    const n = dayNumber(l.date);
    return n >= first && n <= last && l.consumed.kcal > 0;
  }).length;
  return {
    weighIns: pts.length,
    days,
    coveragePct: days > 0 ? Math.round((intake / days) * 100) : 0,
    needWeighIns: 4,
    needDays: 14,
    needCoveragePct: 70,
  };
}

/** "9 a 15 de novembro" para a semana de `d`. */
export function weekRangeLabel(d: Date): string {
  const days = weekDays(d);
  const a = days[0];
  const b = days[6];
  const mes = (x: Date) => x.toLocaleDateString("pt-BR", { month: "long" });
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${mes(b)}`
    : `${a.getDate()} de ${mes(a)} a ${b.getDate()} de ${mes(b)}`;
}


// ───────────── Peso por semana e por mês ─────────────

export interface WeightPeriod {
  key: string; // início da semana (YYYY-MM-DD) ou mês (YYYY-MM)
  label: string;
  avg: number;
  n: number;
  /** Variação em relação ao período anterior com pesagem (null no primeiro). */
  delta: number | null;
}

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function periods(
  logs: Record<string, DailyLog>,
  keyOf: (date: string) => string,
  labelOf: (key: string) => string,
  last: number,
): WeightPeriod[] {
  const g = new Map<string, number[]>();
  for (const l of Object.values(logs)) {
    if (l.weightKg === undefined) continue;
    const k = keyOf(l.date);
    g.set(k, [...(g.get(k) ?? []), l.weightKg]);
  }
  const rows = [...g.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, label: labelOf(key), avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }));
  return rows.map((r, i) => ({ ...r, delta: i ? r.avg - rows[i - 1].avg : null })).slice(-last);
}

const parseKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
};

/** Média das pesagens por semana (seg a dom). */
export const weeklyWeights = (logs: Record<string, DailyLog>, last = 5): WeightPeriod[] =>
  periods(
    logs,
    (d) => toDateKey(weekStart(parseKey(d))),
    (k) => {
      const a = parseKey(k);
      const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
      return a.getMonth() === b.getMonth()
        ? `${a.getDate()} a ${b.getDate()} ${MES[b.getMonth()]}`
        : `${a.getDate()} ${MES[a.getMonth()]} a ${b.getDate()} ${MES[b.getMonth()]}`;
    },
    last,
  );

/** Média das pesagens por mês. */
export const monthlyWeights = (logs: Record<string, DailyLog>, last = 6): WeightPeriod[] =>
  periods(logs, (d) => d.slice(0, 7), (k) => MES[Number(k.slice(5, 7)) - 1], last);

/** Déficit estimado (gasto − comido) nos dias fechados de [from, to], em kcal. */
export function deficitBetween(
  logs: Record<string, DailyLog>,
  fromKey: string,
  toKey: string,
  todayKey: string,
): { kcal: number; days: number } {
  let kcal = 0,
    days = 0;
  for (const l of Object.values(logs)) {
    if (l.date < fromKey || l.date > toKey || l.date >= todayKey || l.consumed.kcal <= 0) continue;
    kcal += l.getKcal - l.consumed.kcal;
    days += 1;
  }
  return { kcal, days };
}
