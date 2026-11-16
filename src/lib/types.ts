// ─────────────────────────────────────────────────────────────
// Modelos de dados do app. Espelham docs/schema.sql (Postgres/Supabase),
// então migrar do localStorage para um banco depois é trocar só a camada de store.
// ─────────────────────────────────────────────────────────────

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "high"
  | "very_high";

/** Fatores de atividade (tabela clássica de Harris-Benedict / Katch). */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

export type BmrFormula = "mifflin" | "harris";

export interface User {
  id: string;
  name: string;
  sex: Sex;
  /** ATENÇÃO: idade não foi informada no briefing. Valor padrão é um chute — ajuste. */
  age: number;
  weightKg: number;
  heightCm: number;
  /** Da avaliação física (opcional). */
  bodyFatPct?: number;
  leanMassKg?: number;
  /** false/ausente = mostra o passo a passo de boas-vindas. */
  onboarded?: boolean;
  activityLevel: ActivityLevel;
  /** Permite sobrescrever o fator (1.9 pode superestimar o gasto real). */
  activityFactor: number;
  bmrFormula: BmrFormula;
  waterGoalMl: number;
}

export type FoodCategory =
  | "proteins"
  | "produce"
  | "carbs"
  | "dairy"
  | "fats"
  | "supplements"
  | "others";

export type Unit = "g" | "ml" | "un";

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  unit: Unit;
  /** Quantidade a que `macros` se refere: 100 para g/ml, 1 para "un". */
  baseAmount: number;
  macros: Macros;
}

/** Um alimento dentro de uma refeição do plano, com a quantidade planejada. */
export interface PlanItem {
  id: string;
  foodId: string;
  quantity: number;
  /** Substituição sugerida pelo nutricionista. */
  note?: string;
}

export interface Meal {
  id: string;
  name: string;
  time: string; // "HH:mm"
  items: PlanItem[];
}

export interface MealPlan {
  id: string;
  name: string;
  /** Plano diário. A lista de compras multiplica por 7. */
  meals: Meal[];
}

/** O que a pessoa realmente comeu no lugar de um item do plano. */
export interface Swap {
  name: string;
  /** Macros do que foi comido (do catálogo ou estimados). */
  macros: Macros;
  foodId?: string;
  quantity?: number;
  /** Quantidade em texto, quando vem da lista de equivalentes (ex.: "1 unidade · 50 g"). */
  detail?: string;
}

/** Treino do dia: só musculação, ou musculação + cardio (30 a 40 min). Ausente = não treinou. */
export type Workout = "weights" | "weights_cardio";

export interface DailyLog {
  /** YYYY-MM-DD (data local) */
  date: string;
  mealPlanId: string;
  /** ids dos PlanItem marcados como consumidos */
  checkedItemIds: string[];
  /** ids dos PlanItem que a pessoa marcou como "não comi" (não contam como consumidos nem como pendentes) */
  skippedItemIds?: string[];
  /** Substituições do dia, por id de item do plano. O item trocado conta como comido. */
  swaps?: Record<string, Swap>;
  /** Treino marcado no dia (ausente = não treinou). */
  workout?: Workout;
  /** Nota da dieta do dia, de 1 a 10 (snapshot; ausente = sem marcação). */
  score?: number;
  waterMl: number;
  /** Pesagem do dia (jejum), se houver. */
  weightKg?: number;
  /**
   * Snapshot calculado a cada marcação. Guardar o total no log mantém o
   * histórico correto mesmo se você editar o plano ou o peso depois.
   */
  consumed: Macros;
  getKcal: number;
}

export const EMPTY_MACROS: Macros = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};
