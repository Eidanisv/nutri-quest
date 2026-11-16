// Lista de substituição do nutricionista (cada item equivale a UMA porção do grupo).
// Fonte: folha "Lista de substituição" entregue pelo nutricionista. Quantidades e kcal por porção copiadas dela.

export interface EquivItem {
  name: string;
  /** Medida caseira, como está na folha (ex.: "4 col. de sopa cheias"). */
  measure: string;
  /** Peso (g) ou volume (ml) de UMA porção. */
  amount: number;
  unit: "g" | "ml";
}

export interface EquivGroup {
  id: string;
  /** Nome curto, para o filtro. */
  label: string;
  /** Calorias de uma porção do grupo. */
  kcal: number;
  items: EquivItem[];
  /** Palavras que ajudam a achar o grupo de um alimento do catálogo. */
  keywords: string[];
}

// "Nome | medida | quantidade"; sufixo "ml" na quantidade = volume, senão gramas.
const rows = (txt: string): EquivItem[] =>
  txt
    .trim()
    .split("\n")
    .map((l) => {
      const [name, measure, q] = l.split("|").map((s) => s.trim());
      const ml = q.endsWith("ml");
      return { name, measure, amount: parseFloat(q), unit: ml ? "ml" : "g" } as EquivItem;
    });

export const EQUIV_GROUPS: EquivGroup[] = [
  {
    id: "cereais",
    label: "Pães e cereais",
    kcal: 149,
    keywords: ["pao", "bolo", "biscoito", "torrada", "aveia", "tapioca", "cuscuz", "granola", "bolacha"],
    items: rows(`
Pão francês | 1 unidade | 50g
Pão de forma | 2 fatias | 50g
Pão de queijo | 1 unidade grande | 40g
Pão de batata | 1 unidade média | 50g
Pão de hambúrguer | ½ unidade | 35g
Torrada pão francês | 6 fatias | 36g
Torrada industrial | 4 unidades | 40g
Biscoito água e sal | 6 unidades | 30g
Biscoito maisena | 7 unidades | 35g
Bolo simples | 1 fatia fina | 30g
Bolo de banana | 1 fatia fina | 50g
Bolo de cenoura | 1 fatia fina | 30g
Bolo de chocolate | 1 fatia fina | 30g
Bolo de milho | 1 fatia média | 60g
Farinha de aveia | 2½ col. de sopa | 45g
Amido de milho | 2 col. de sopa | 40g
Pamonha | ½ unidade | 80g
Pipoca com óleo sem sal | 3 xícaras de chá | 34g
`),
  },
  {
    id: "amidos",
    label: "Arroz e batata",
    kcal: 125,
    keywords: ["arroz", "batata", "mandioca", "macarrao", "massa", "aipim", "inhame", "farofa", "milho", "angu", "macaxeira"],
    items: rows(`
Arroz branco ou integral | 4 col. de sopa cheias | 100g
Batata cozida | 1½ unidade média | 150g
Batata doce cozida | 4 col. de sopa cheias | 110g
Batata frita (caseira) | 1 porção pequena | 45g
Batata sauté | 3 col. de sopa cheias | 100g
Mandioca cozida / aipim | 3½ col. de sopa | 100g
Macarrão cozido | 3 col. de sopa | 80g
Inhame cozido | 3½ col. de sopa | 100g
Cará cozido amassado | 3 col. de sopa | 90g
Angu | 3 col. de sopa | 120g
Farofa | 2 col. de sopa cheias | 30g
Milho verde (espiga) | 1 espiga média | 80g
Milho verde em lata | 6 col. de sopa cheias | 140g
`),
  },
  {
    id: "carnes",
    label: "Carnes e ovos",
    kcal: 153,
    keywords: ["frango", "carne", "bife", "ovo", "peixe", "tilapia", "atum", "sardinha", "hamburguer", "linguica", "salsicha", "omelete", "peito", "patinho", "file", "camarao", "bacalhau"],
    items: rows(`
Frango grelhado | 1 filé médio | 80g
Frango ao molho pardo | ½ peito médio | 90g
Frango assado (sobrecoxa) | 1 sobrecoxa média | 65g
Bife grelhado magro | 1 unidade pequena | 80g
Bife bovino à rolê | 1 unidade pequena | 80g
Bife de fígado bovino | 1 unidade pequena | 80g
Carne moída refogada | 3 col. de sopa cheias | 75g
Carne cozida | 3 pedaços pequenos | 60g
Carne bovina assada | ½ unidade grande | 67g
Carne bovina seca cozida | 3 col. de sopa cheias | 54g
Carré | 1 unidade pequena | 60g
Costela bovina assada | 1 pedaço médio | 40g
Hambúrguer grelhado | 1 unidade média | 90g
Linguiça de porco | 1 gomo | 50g
Salsicha hot dog | 3 unidades médias | 93g
Ovo cozido | 2 unidades médias | 90g
Omelete simples | 1 porção com 2 ovos | 130g
Peixe (filé de merluza) | ½ filé grande | 80g
Peixe ensopado | 1 filé pequeno | 100g
Sardinha | 2 unidades médias | 50g
Atum sólido em óleo | 4 col. de sopa cheias | 64g
Bacalhau refogado | 4 col. de sopa cheias | 80g
Camarão frito | 10 unidades pequenas | 50g
`),
  },
  {
    id: "leite",
    label: "Leite e queijos",
    kcal: 98,
    keywords: ["leite", "iogurte", "queijo", "mussarela", "muçarela", "mucarela", "requeijao", "ricota", "minas", "coalhada"],
    items: rows(`
Leite de vaca integral | 1 copo americano | 165ml
Leite de vaca semidesnatado | 1 copo americano | 165ml
Iogurte desnatado natural | 1 copo | 200g
Iogurte integral natural | 1 porção comercial | 170g
Iogurte integral de frutas | 1 porção comercial | 120g
Queijo muçarela | 1 fatia média | 20g
Queijo prato | 2 fatias finas | 20g
Queijo provolone | 1 fatia média | 25g
Queijo minas frescal | 1 fatia média | 30g
Queijo minas padrão | 1 fatia pequena | 25g
Queijo parmesão ralado | 1 col. de sopa cheia | 15g
Requeijão cremoso | 1 col. de sopa cheia | 45g
Ricota | 1½ fatia média | 50g
`),
  },
  {
    id: "frutas",
    label: "Frutas",
    kcal: 65,
    keywords: ["fruta", "banana", "laranja", "maca", "mamao", "uva", "manga", "abacaxi", "melancia", "melao", "morango", "kiwi", "pera", "pessego", "tangerina", "goiaba", "abacate", "ameixa", "caju"],
    items: rows(`
Banana prata | 1 unidade média | 60g
Maçã | 1 unidade pequena | 115g
Laranja | 1 unidade média | 140g
Tangerina | 1 unidade média | 150g
Mamão papaia | ½ unidade grande | 180g
Mamão formosa | 1 fatia média | 170g
Manga Palmer | ½ unidade grande | 105g
Abacaxi | 1 fatia grossa | 115g
Melancia | 1 fatia grossa | 275g
Melão | 1 fatia grossa | 240g
Morango | 12 unidades médias | 200g
Uva Itália | 10 bagos | 90g
Uva comum | 1 cacho pequeno | 95g
Kiwi | 1 unidade grande | 125g
Pera Willians | ½ unidade grande | 120g
Pêssego | 2 unidades pequenas | 140g
Goiaba | 1 unidade média | 90g
Abacate | 1 col. de sopa cheia | 35g
Ameixa | 3 unidades médias | 120g
Caju | 1 unidade média | 120g
Caqui | ½ unidade média | 90g
Carambola | 2 unidades | 180g
Cereja fresca | 24 unidades | 96g
Damasco seco | 4 unidades | 30g
Jabuticaba | 20 unidades | 140g
Acerola | 32 unidades | 220g
Maracujá (suco) | ½ unidade grande | 95g
Suco de laranja | 1 copo americano | 165ml
`),
  },
  {
    id: "legumes",
    label: "Verduras e legumes",
    kcal: 17,
    keywords: ["verdura", "legume", "alface", "tomate", "cenoura", "brocolis", "beterraba", "pepino", "repolho", "couve", "espinafre", "chuchu", "abobora", "abobrinha", "berinjela", "rucula", "salada", "pimentao"],
    items: rows(`
Alface | 1½ pratos rasos cheios | 120g
Tomate | 6 fatias médias | 90g
Cenoura cozida picada | 2½ col. de sopa cheias | 62g
Cenoura crua picada | 4 col. de sopa cheias | 48g
Beterraba cozida | 2½ col. de sopa cheias | 50g
Beterraba crua ralada | 2 col. de sopa cheias | 32g
Brócolis cozido | 6 col. de sopa cheias | 60g
Pepino picado | 8 col. de sopa | 144g
Repolho branco picado | 4 col. de sopa cheias | 40g
Repolho roxo picado | 3 col. de sopa cheias | 30g
Couve refogada | 1 col. de sopa cheia | 20g
Espinafre refogado | 1 col. de sopa cheia | 25g
Chuchu cozido | 4 col. de sopa cheias | 80g
Abóbora (moranga) | 2 col. de sopa cheias | 72g
Abobrinha italiana | 3 col. de sopa cheias | 90g
Berinjela cozida | 3 col. de sopa | 75g
Couve-flor cozida | 3 col. de sopa cheias | 75g
Pimentão verde cru | 5 col. de sopa cheias | 65g
Pimentão vermelho cru | 5 col. de sopa cheias | 65g
Rabanete | 4 unidades | 100g
Acelga crua picada | 12 col. de sopa cheias | 72g
Agrião | 1½ pratos rasos cheios | 120g
Chicória crua | 9 folhas médias | 108g
Mostarda folha cozida | 2 col. de sopa cheias | 90g
Maxixe refogado | 1½ col. de sopa cheia | 60g
Jiló refogado | 1 unidade média | 26g
Palmito em conserva | 1 unidade média | 100g
Aspargo em conserva | 11 unidades | 82g
`),
  },
  {
    id: "leguminosas",
    label: "Feijão e grãos",
    kcal: 59,
    keywords: ["feijao", "lentilha", "grao de bico", "ervilha", "leguminosa"],
    items: rows(`
Feijão carioca cozido | 1 concha média rasa | 80g
Feijão preto cozido | 1 concha média rasa | 80g
Grão de bico cozido | 2 col. de sopa cheias | 44g
Lentilha cozida | 3 col. de sopa | 54g
Ervilha vagem | 2½ col. de sopa cheias | 75g
`),
  },
  {
    id: "gorduras",
    label: "Óleos e gorduras",
    kcal: 52,
    keywords: ["azeite", "oleo", "manteiga", "margarina", "maionese", "pasta de amendoim", "creme de leite", "bacon", "castanha"],
    items: rows(`
Óleo vegetal | 1 col. de sopa | 8ml
Azeite de dendê | 1 col. de sopa | 8ml
Pasta de amendoim | 2 col. de chá | 12g
Manteiga | 1 col. de chá cheia | 8g
Margarina | 1 col. de chá | 8g
Maionese | 1 col. de sopa | 27g
Creme de leite | 1 col. de sopa | 30g
Bacon | ½ fatia média | 7g
`),
  },
  {
    id: "doces",
    label: "Doces (uso limitado)",
    kcal: 87,
    keywords: ["doce de leite", "doce", "acucar", "mel", "chocolate", "achocolatado", "geleia", "goiabada", "bananada", "brigadeiro"],
    items: rows(`
Doce de leite cremoso | 1 col. de sopa | 25g
Chocolate ao leite (barra) | 2 unidades | 20g
Mel | 2 col. de sopa | 30g
Açúcar | 1 col. de sopa | 24g
Achocolatado em pó | 1½ col. de sopa | 24g
Geleia de fruta | 1 col. de sopa | 34g
Goiabada cascão | ½ fatia média | 30g
Bananada | 2 unidades pequenas | 30g
`),
  },
];

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Descobre a que grupo da folha um alimento do catálogo pertence (pelo nome). null = não achou. */
export function groupFor(foodName: string): EquivGroup | null {
  const n = norm(foodName);
  let best: { g: EquivGroup; len: number } | null = null;
  for (const g of EQUIV_GROUPS) {
    const candidates = [...g.keywords.map(norm), ...g.items.map((i) => norm(i.name))];
    for (const c of candidates) {
      if (c.length >= 3 && n.includes(c) && (!best || c.length > best.len)) best = { g, len: c.length };
    }
  }
  return best?.g ?? null;
}

/** Quantas porções do grupo um item do plano vale, arredondado para meia porção (mínimo 0,5). */
export function portionsOf(group: EquivGroup, plannedKcal: number): number {
  if (!(plannedKcal > 0)) return 1;
  return Math.min(10, Math.max(0.5, Math.round((plannedKcal / group.kcal) * 2) / 2));
}

const fmtN = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
export const fmtPortions = (p: number) => `${fmtN(p)} ${p > 1 ? "porções" : "porção"}`;

/** Texto da quantidade de um substituto para `p` porções. */
export function equivDetail(it: EquivItem, p: number): string {
  const total = `${fmtN(it.amount * p)} ${it.unit}`;
  return p === 1 ? `${it.measure} · ${total}` : `${fmtPortions(p)} · ${total}`;
}
