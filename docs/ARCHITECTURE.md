# FORM+ — architektura

## 1. Architektura techniczna

Aplikacja jest w pełni kliencka (offline-first). Nie wymaga serwera ani płatnego API.

```
UI (React 19 + TS)  ──►  store (useSyncExternalStore)  ──►  db.ts (IndexedDB)
      │                         │                              ▲
      │                         └── engine/* (czyste funkcje) ─┘ (testowane node:test)
      ├── ui/Figure  (silnik pozy 2D: FK/IK + keyframes → animacja SVG)
      ├── ui/Atlas   (SVG: przód/tył, kobieta/mężczyzna, 19 grup mięśni)
      └── Service Worker (precache + fallback offline) + manifest PWA
```

Zasady:
- **Czysta logika oddzielona od UI** (`engine/`): generator planów, timery, statystyki, progresja,
  sesja treningowa. Dzięki temu da się ją testować bez przeglądarki.
- **Czas oparty na znacznikach czasu** (`Date.now()`), nie na licznikach `setInterval`.
  Timery poprawnie "doganiają" po powrocie aplikacji z tła.
- **Szkic sesji (`draft`) zapisywany w IndexedDB po każdej zmianie** → odświeżenie strony nie gubi treningu.
- **Dane ćwiczeń to statyczny moduł TS** (`data/`), walidowany testami (spójność mięśni, alternatyw, duplikatów).
- **Synchronizacja**: interfejs `SyncAdapter` jest zarezerwowany; w wersji 1 nie ma implementacji
  (nie udajemy synchronizacji — patrz raport).
- **3D**: `visualId`/`animationId` w modelu ćwiczenia + `ModelProvider` pozwalają podmienić renderer SVG na 3D.

## 2. Struktura katalogów

```
formplus/
  public/            index.html, manifest, ikony
  src/
    core/            types, db (IndexedDB), store, i18n, audio, time
    data/            muscles, equipment, exercises (gym/home/kettlebell/mobility), poses, templates, routines
    engine/          timer, generator, stats, progression, workout, figure (FK/IK)
    ui/              components, icons, Figure, Atlas, Charts
    screens/         Onboarding, Dashboard, Plan, Library, ExerciseDetail, AtlasScreen,
                     Workout, Timers, Progress, Settings
  tests/             node:test (logika)
  e2e/               playwright (przeglądarka, IndexedDB, offline, odświeżenie)
  build.mjs          esbuild + generowanie SW i ikon
```

## 3. Model danych (skrót; pełny w `src/core/types.ts`)

- `Exercise`: id, pl, en, cat, module, kind, stretchType, primary[], secondary[], equipment[], level,
  steps[], cues[], mistakes[], safety[], breathing, scheme{sets,reps|seconds,rest,perSide}, illustrationId,
  animationId, alt[], tags[], location[], flags[], contra?
- `Profile`: gender, age, height?, weight?, level, goal, location, equipment[], daysPerWeek, minutes, intensity, limitations[]
- `Plan`: id, name, days[7] (PlanDay: kind, title, items[PlanItem]), generatedFrom? (wejście + seed + wersja generatora)
- `WorkoutDraft` → `SessionRecord`: serie/powtórzenia/ciężary/czas/dystans/RPE/samopoczucie/notatki
- `Measurement`: własne pomiary zakresu ruchu (nazwa, wartość, jednostka, data, notatka)

Magazyny IndexedDB: `kv` (profil, ustawienia, szkic sesji), `plans`, `sessions` (indeks `date`), `measurements`.

## 4. Makiety pięciu głównych ekranów

```
PULPIT                          MÓJ PLAN                        ĆWICZENIA
┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
│ Cześć, Ola     ⚙ 👤   │       │ Plan: Upper/Lower  ▾  │       │ 🔍 szukaj…    [filtry]│
│ ┌───────────────────┐ │       │ Pn Wt Śr Cz Pt So Nd  │       │ [Siłownia|Dom|KB|Mobil]│
│ │ DZISIEJSZY TRENING│ │       │ ●  ◌  ●  ·  ●  ◌  ·   │       │ [Atlas mięśni]        │
│ │ Góra ciała  45 min│ │       │ ┌───────────────────┐ │       │ ┌───┐ Przysiad ze sztangą│
│ │ 7 ćw. [ROZPOCZNIJ]│ │       │ │ Pn Góra ciała     │ │       │ │fig│ nogi · ★★☆ · sztanga│
│ └───────────────────┘ │       │ │  1 Wyciskanie…  ↑↓│ │       │ └───┘ [+ do planu]       │
│ Twój tydzień  2/4  🔥3│       │ │  2 Wiosłowanie… ↑↓│ │       │ ┌───┐ …                  │
│ Postępy: rekord…      │       │ │ [+ ćwiczenie] [⇄] │ │       │                       │
│ [Stretching][Atlas]…  │       │ └───────────────────┘ │       │                       │
└───────────────────────┘       └───────────────────────┘       └───────────────────────┘
 Pulpit Plan Ćwicz. Trening Postępy

TRENING (aktywny)                              POSTĘPY
┌───────────────────────┐                      ┌───────────────────────┐
│ Goblet Squat   ⏸  ✕   │                      │ [Tydzień|Miesiąc|Rok] │
│   ┌─────────────┐     │                      │ Treningi/tydz ▇▇▃▇    │
│   │ animacja    │ ▶   │                      │ Objętość     ▂▄▆▇     │
│   └─────────────┘     │                      │ Rekordy: Przysiad 80kg│
│ Seria 2 z 4           │                      │ Ćwiczenie ▾ → wykres  │
│ − 12 +  powt.         │                      │ Mobilność: 85 min     │
│ − 16 +  kg  (poprz.14)│                      │ Pomiary zakresu ruchu │
│ [  ZAKOŃCZ SERIĘ  ]   │                      └───────────────────────┘
│ Dalej: Kettlebell Row │
│ Odpoczynek 0:42 [+15s]│
└───────────────────────┘
```

## 5. Kolejność wdrożenia

1. Szkielet, motywy, nawigacja, i18n, IndexedDB, onboarding
2. Baza ćwiczeń + wyszukiwanie + ekran ćwiczenia + silnik figur + atlas
3. Aktywny trening + timery
4. Plan tygodnia + szablony + generator
5. Stretching/mobilność i kettlebell (sesje prowadzone, EMOM/AMRAP/Tabata)
6. Postępy, eksport/import
7. Testy (jednostkowe + przeglądarkowe), PWA/offline, raport
