# FORM+ — stan projektu

**Migawka 2026-11-10:** na podstawie README.md, docs/ARCHITECTURE.md, package.json i wybranych plików źródłowych, main @ f2e2f2af2b687bfe0d1489fdeb8436f8fd742c0e. Nie uruchomiono testów aplikacji w ramach tworzenia tej notatki.

## Cel i architektura
Aplikacja treningowa PWA offline-first dla siłowni, domu, kettlebell, stretchingu, mobilności i pracy nad postawą. React 19, TypeScript, esbuild, własny CSS/SVG, service worker, IndexedDB, bez konta i płatnego API.
- src/core/ — typy, lokalna baza, store, i18n, czas.
- src/data/ — ćwiczenia, atlas, pozycje, rutyny i szablony.
- src/engine/ — planowanie, trening, timery, statystyki, progresja.
- src/screens/ i src/ui/ — interfejs, atlas i animacje sylwetki 2D.
- tests/ — testy jednostkowe; e2e/ — testy przeglądarkowe.
- .github/workflows/deploy.yml — instalacja, testy, build i publikacja GitHub Pages przy push do main.

## Funkcje według README
Trzy niezależne profile, onboarding, cztery motywy, tłumaczenie interfejsu PL/EN, 108 rekordów ćwiczeń (47 z animacją/pozą), plan tygodniowy i generator regułowy, trening z zapisem szkicu, historia/postępy, Tabata/EMOM/AMRAP, stretching, moduł Kręgosłup, eksport/import JSON/CSV, offline po pierwszym załadowaniu.

## Jawne ograniczenia
Brak Supabase, HealthKit, powtórzeń liczonych kamerą i pełnego 3D; angielskie tłumaczenie nie obejmuje pełnych opisów ćwiczeń; część ćwiczeń nie ma animacji. Safari może ograniczać timery i dźwięki w tle. Nie ma pełnego kalendarza wielotygodniowego; typowanie UI jest częściowo ograniczone.
Moduł Kręgosłup nie diagnozuje ani nie zastępuje fizjoterapii.

## Polecenia
npm install; npm test; npm run typecheck; npm run build; npm run serve. E2E: node e2e/e2e.mjs po build z Playwright/Chromium.

**Weryfikacja:** sprawdzono zawartość repo, lecz w tej operacji nie wykonywano testów runtime. Po zmianach produktu odśwież z kodu, a nie z samych notatek.
