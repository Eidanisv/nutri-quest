# FUEL — dieta, água e déficit

App mobile-first (dark/neon) para acompanhar refeições, água, compras, peso e déficit calórico.
Funciona 100% offline/local; com uma conta Supabase, sincroniza entre celular e computador.

```bash
npm install
npm run dev      # http://localhost:3000
```

Precisa do Node.js 20+. `npm run build` não funciona em disco exFAT (limitação do Windows/Node);
em NTFS e na Vercel funciona normalmente.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Zustand (estado + localStorage) · Recharts ·
Framer Motion · Supabase (login + banco).

## Estrutura

```
src/lib/types.ts      modelos: User, FoodItem, MealPlan (Meal, PlanItem), DailyLog
src/lib/calc.ts       TMB/GET, macros, semana, compras, calibração do GET (funções puras)
src/lib/seed.ts       perfil padrão e catálogo básico de alimentos (genéricos, sem dados pessoais)
src/lib/store.ts      estado, ações de edição, migração de versão
src/lib/backup.ts     exportar/importar backup .json (com validação)
src/lib/supabase.ts   cliente Supabase (desligado se faltarem as variáveis de ambiente)
src/lib/sync.ts       sincronização offline-first (pull/push por pedaço, vence a edição mais recente)
src/components/       Dashboard, Onboarding, Settings (Perfil/Dieta/Alimentos/Conta), gráficos…
docs/schema.sql       tabelas e regras de segurança do Supabase
```

## Ligar a sincronização (Supabase)

1. **Banco:** Supabase → SQL Editor → New query → cole o conteúdo de `docs/schema.sql` → Run.
2. **Login:** Authentication → Providers → Email: ligado. Para uso pessoal você pode desligar
   "Confirm email" (entra direto); para outras pessoas, deixe ligado.
3. **Chaves:** Project Settings → API → copie *Project URL* e *anon public key*.
   Copie `.env.local.example` para `.env.local` e cole os dois valores. Reinicie o `npm run dev`.
   (Nunca use a chave `service_role` e nunca commite o `.env.local`.)
4. **Vercel:** em Settings → Environment Variables, crie as mesmas duas variáveis. No Supabase,
   Authentication → URL Configuration → Site URL = o endereço do app na Vercel.

No app: Ajustes → Conta → Criar conta / Entrar.

## Como a sincronização funciona

- O aparelho guarda tudo (funciona sem internet). Cada pedaço — a configuração (perfil, dieta,
  alimentos, compras) e um registro por dia — tem um horário de edição.
- A cada mudança (após ~1,5 s), ao voltar para o app e a cada 90 s, o app baixa o que é mais novo
  na nuvem e envia o que mudou aqui. No mesmo pedaço, vence a edição mais recente.
- Primeiro login num aparelho que já tem dados e numa conta que já tem dados: o app pergunta qual
  manter (nuvem ou aparelho).
- "Apagar todos os dados" apaga também a nuvem quando você está conectado.

## Cálculos

- **TMB (Mifflin-St Jeor):** `10·kg + 6,25·cm − 5·idade + 5` (homem) / `− 161` (mulher)
- **GET:** `TMB × fator de atividade`. O fator é uma estimativa; a aba Peso calibra com o seu peso real.
- **Calibração:** `GET observado = ingestão média − (kg/dia × 7.700)`, com ≥ 4 pesagens, ≥ 14 dias e
  refeições marcadas em ≥ 70% dos dias.
