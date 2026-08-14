# Accessibility Compliance Radar

Wklej link do strony → automatyczny audyt WCAG 2.1 AA (Playwright + axe-core) → gotowy PDF do pobrania.

Zbudowane pod kątem European Accessibility Act (EAA, obowiązuje od 06.2025) — szybki, jednorazowy audyt
zgodności bez ręcznej pracy.

## Jak to działa

1. Użytkownik wkleja URL na stronie głównej.
2. `/api/audit` uruchamia headless Chromium (Playwright), otwiera stronę i skanuje ją silnikiem
   [axe-core](https://github.com/dequelabs/axe-core) przez `@axe-core/playwright`.
3. Wynik jest renderowany jako HTML i zapisywany do PDF (`page.pdf()`), w formacie zbliżonym do
   raportu agencyjnego — z podziałem na naruszenia krytyczne/poważne/drobne, kodem HTML winowajcy i
   sugerowaną poprawką z axe-core (`failureSummary`).
4. PDF wraca do przeglądarki jako base64 i pobiera się automatycznie.

## Ograniczenia — ważne

Raport jest **w 100% automatyczny**, bez ręcznej weryfikacji. Automatyczne skanery typu axe-core wykrywają
tylko część typów naruszeń WCAG (dobrze radzą sobie z alt-textem, kontrastem, etykietami formularzy;
gorzej z rzeczami wymagającymi interakcji, np. pułapkami fokusu w niestandardowych komponentach). Przed
wysłaniem raportu klientowi warto ręcznie zweryfikować pozycje oznaczone jako krytyczne/poważne.

## Rozwój lokalny

```bash
npm install
npx playwright install chromium   # tylko pierwszy raz, do lokalnego uruchomienia
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

## Deploy na Vercel

Serverless functions Vercela nie mieszczą pełnego Chromium Playwrighta, dlatego produkcyjnie używany jest
`playwright-core` + [`@sparticuz/chromium`](https://github.com/Sparticuz/chromium) (patrz `lib/browser.ts`,
przełącza się automatycznie po zmiennej środowiskowej `VERCEL`, którą Vercel ustawia sam).

```bash
vercel deploy
```

Warto ustawić `maxDuration` funkcji (`app/api/audit/route.ts`) zależnie od planu Vercela — skan + render
PDF zwykle mieści się w 15-30s, ale wolne strony mogą to wydłużyć.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Playwright · axe-core
