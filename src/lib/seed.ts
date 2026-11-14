import { ACTIVITY_FACTORS, type FoodItem, type MealPlan, type User } from "./types";

// Estado inicial GENÉRICO. Nenhum dado pessoal vai dentro do código.
export const DEFAULT_USER: User = {
  id: "me",
  name: "",
  sex: "male",
  age: 30,
  weightKg: 75,
  heightCm: 175,
  activityLevel: "moderate",
  activityFactor: ACTIVITY_FACTORS.moderate,
  bmrFormula: "mifflin",
  waterGoalMl: 3000,
  onboarded: false,
};

export const DEFAULT_PLAN: MealPlan = {
  id: "plano-1",
  name: "Minha dieta",
  meals: [],
};

// Catálogo básico — valores aproximados da tabela TACO por 100 g/ml (ou por unidade
// quando unit = "un"). Confira com o rótulo do que você realmente come.
const f = (
  id: string,
  name: string,
  category: FoodItem["category"],
  unit: FoodItem["unit"],
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
): FoodItem => ({
  id,
  name,
  category,
  unit,
  baseAmount: unit === "un" ? 1 : 100,
  macros: { kcal, protein, carbs, fat, fiber },
});

export const DEFAULT_FOODS: FoodItem[] = [
  // Proteínas
  f("frango", "Filé de frango grelhado", "proteins", "g", 159, 32, 0, 2.5, 0),
  f("frango-cozido", "Peito de frango cozido", "proteins", "g", 163, 31.5, 0, 3.2, 0),
  f("patinho", "Patinho grelhado", "proteins", "g", 219, 35.9, 0, 7.3, 0),
  f("tilapia", "Tilápia grelhada", "proteins", "g", 128, 26, 0, 2.7, 0),
  f("ovo-cozido", "Ovo cozido (50 g)", "proteins", "un", 73, 6.7, 0.3, 4.8, 0),
  f("ovo-mexido", "Ovo mexido", "proteins", "un", 71.5, 5.5, 0.5, 5.3, 0),
  // Carboidratos
  f("arroz", "Arroz tipo 1 cozido", "carbs", "g", 128, 2.5, 28.1, 0.2, 1.6),
  f("arroz-integral", "Arroz integral cozido", "carbs", "g", 124, 2.6, 25.8, 1, 2.7),
  f("feijao", "Feijão carioca cozido", "carbs", "g", 76, 4.8, 13.6, 0.5, 8.5),
  f("macarrao", "Macarrão cozido", "carbs", "g", 102, 3.4, 19.9, 0.5, 1.4),
  f("batata-doce", "Batata-doce cozida", "carbs", "g", 77, 0.6, 18.4, 0.1, 2.2),
  f("batata", "Batata inglesa cozida", "carbs", "g", 52, 1.2, 11.9, 0, 1.3),
  f("mandioca", "Mandioca cozida", "carbs", "g", 125, 0.6, 30.1, 0.3, 1.6),
  f("pao-frances", "Pão francês (50 g)", "carbs", "un", 150, 4, 29.3, 1.6, 1.2),
  f("aveia", "Aveia em flocos", "carbs", "g", 394, 13.9, 66.6, 8.5, 9.1),
  // Hortifruti
  f("alface", "Alface americana", "produce", "g", 9, 0.6, 1.7, 0.1, 1),
  f("tomate", "Tomate", "produce", "g", 15.6, 1.1, 3.1, 0.2, 1.2),
  f("beterraba", "Beterraba cozida", "produce", "g", 32, 1.3, 7.2, 0.1, 1.9),
  f("cenoura", "Cenoura cozida", "produce", "g", 30, 0.8, 6.7, 0.2, 2.6),
  f("brocolis", "Brócolis cozido", "produce", "g", 25, 2.1, 4.4, 0.5, 3.4),
  f("banana", "Banana-maçã (unidade)", "produce", "un", 87, 1.1, 22.3, 0.1, 1.9),
  f("laranja", "Laranja-lima (unidade)", "produce", "un", 46, 0.8, 11.5, 0.1, 1.5),
  f("mamao", "Mamão papaia", "produce", "g", 40, 0.5, 10.4, 0.1, 1),
  f("uva", "Uva Itália", "produce", "g", 53, 0.7, 13.6, 0.2, 0.9),
  f("abacate", "Abacate", "produce", "g", 96, 1.2, 6, 8.4, 6.3),
  // Laticínios
  f("iogurte", "Iogurte desnatado", "dairy", "g", 34, 3.5, 5, 0.2, 0),
  f("leite-desnatado", "Leite desnatado", "dairy", "ml", 34, 3.4, 5, 0.1, 0),
  f("leite-integral", "Leite integral", "dairy", "ml", 61, 3.2, 4.6, 3.3, 0),
  f("mussarela", "Queijo mussarela", "dairy", "g", 330, 22.6, 3, 25.2, 0),
  // Gorduras
  f("azeite", "Azeite extra virgem", "fats", "ml", 880, 0, 0, 100, 0),
  f("pasta-amendoim", "Pasta de amendoim", "fats", "g", 590, 25, 20, 50, 6),
  f("castanha", "Castanha-do-pará", "fats", "g", 643, 14.5, 15.1, 63.5, 7.9),
  // Suplementos / outros
  f("whey", "Whey protein 100%", "supplements", "g", 427, 80, 10, 6.7, 0),
  f("cafe", "Café, infusão 10%", "others", "ml", 9, 0.7, 1.5, 0, 0),
];
