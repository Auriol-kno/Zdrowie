# Od Claude — dla ChatGPT

Tylko Claude dopisuje tu wiadomości; ChatGPT jedynie czyta. Nie usuwaj historii.

**Stan początkowy 2026-11-10:** nie ma jeszcze potwierdzonej wiadomości Claude w tym systemie. Nie oznacza to, że Claude wcześniej nie tworzył kodu.

Claude: po przeczytaniu AGENTS.md, CLAUDE.md i .ai/README.md dodaj pierwszy wpis według .ai/HANDOFF_TEMPLATE.md. Wpisz datę, bieżący commit, zadanie, gałąź/PR, wykonane testy i następny krok.

### 2026-11-13 — Claude — menu bez kropek, Timery w Ćwiczeniach, plan jako tydzień pn–nd, eksport .ics, przeciąganie
- **Status:** PR (scalenie na wyraźną prośbę użytkownika: „Scal”)
- **Issue:** brak
- **Gałąź / commit / PR:** `claude/ui-nav-plan-calendar` → `main` (numer PR w jego opisie)
- **Cel:** prośba użytkownika: aktywna pozycja menu zaznaczona kolorem (pomarańczowy) zamiast kropki, tło bez kropek/kul, timery w Ćwiczeniach obok Listy/Atlasu/Programów, „Mój plan” jako tydzień pn–nd w dużych kafelkach z datą, dodawanie do kalendarza telefonu, zmiana kolejności ćwiczeń przeciąganiem.
- **Co wykonano:** pomarańczowa „pigułka” aktywnej zakładki (tekst `--on-act`, kontrast AA), usunięte `.tab .dot`, pasek/kropka pod zakładką i dekoracyjne kule `body::before`; wskaźnik treningu w toku to kolor tekstu + tekst dla czytników ekranu; `Timery` jako 4. tryb w Ćwiczeniach (`TimersScreen embedded`); Plan: 7 kafelków z datą (dziś wyróżniony), arkusz „Dodaj do kalendarza” (godzina, liczba tygodni, przypomnienie) → plik .ics (RFC 5545, RRULE tygodniowy, VALARM, zawijanie linii) przez Web Share lub pobranie, także dla pojedynczego dnia; przeciąganie ćwiczeń uchwytem (pointer events, mysz/dotyk, autoprzewijanie), strzałki zostają jako alternatywa. Usunięty martwy plik `src/screens/Posture.tsx` (pozostałość po zmianie nazwy na Builder; powodował błędy typecheck). Poprawiony błąd `dropIndex` znaleziony przez e2e (przeciąganie o jeden wiersz przesuwało o dwa).
- **Pliki:** `src/engine/ics.ts`, `src/engine/reorder.ts`, `src/ui/drag.ts`, `src/screens/{Plan,Timers,Library}.tsx`, `src/App.tsx`, `src/styles.css`, `src/ui/icons.ts`, `src/types/shim.d.ts`, `src/core/en.ts`, `tests/calendar.test.ts`, `tests/theme.test.ts`, `e2e/e2e.mjs`, `README.md`, `src/screens/Posture.tsx` (usunięty)
- **Testy wykonane:** `npx tsx --test tests/*.test.ts` → 40 pass, 0 fail; `node build.mjs` OK; `npx tsc -p tsconfig.check.json --noEmit` (z filtrem znanych szumów shimów) → bez błędów; `node e2e/e2e.mjs` (Playwright/Chromium, emulacja iPhone) → 24 kroki ✔, brak błędów w konsoli, w tym nowe: kolor aktywnej zakładki i brak kropek, Timery w Ćwiczeniach, tydzień pn–nd z datami, pobranie .ics, przeciąganie myszą i strzałki.
- **Testy niewykonane:** import .ics w prawdziwym Kalendarzu iOS/Android oraz przeciąganie dotykiem na realnym urządzeniu (brak urządzenia; sprawdzono tylko mysz w Chromium i logikę jednostkowo).
- **Ryzyka / ograniczenia:** .ics to jednorazowy eksport — późniejsze zmiany planu nie aktualizują kalendarza (aplikacja o tym informuje); czas zdarzeń „pływający” (lokalny). Ten wpis i PR #2 (pierwszy raport, docs) dotykają tego samego pliku — możliwy konflikt przy scalaniu PR #2.
- **Następny krok:** użytkownik — sprawdzić eksport kalendarza i przeciąganie na telefonie; Claude — zaktualizować `.ai/TASKS.md` i decyzję D-004 po decyzji użytkownika (PR #1 jest już scalony). Propozycja UX V2 (docs/FORMPLUS_UX_V2_PROPOSAL.md) nie została wdrożona.
- **Pytanie do drugiego agenta:** brak
