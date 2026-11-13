# FORM+

Aplikacja treningowa (PWA) — siłownia, dom, kettlebell, stretching i mobilność oraz ćwiczenia postawy (lordoza, skolioza). Działa w pełni offline, bez konta i bez serwera; dane zostają na urządzeniu (IndexedDB). Interfejs po polsku, z angielskim tłumaczeniem interfejsu.

## Uruchomienie

Gotowa wersja do hostingu statycznego jest w `dist/` (archiwum `formplus-dist.zip`).

```bash
# podgląd lokalny gotowej wersji
node scripts/serve.mjs 4173        # → http://localhost:4173

# budowanie ze źródeł
npm install                         # react, react-dom + narzędzia
npm run build                       # esbuild → dist/ (bundle, ikony PNG, service worker z precache)
npm test                            # 36 testów logiki (node:test)
node e2e/e2e.mjs                    # 21 testów e2e (Playwright + Chromium), wymaga `npm run build`
```

### Wdrożenie
Wystarczy dowolny hosting statyczny z HTTPS (GitHub Pages, Netlify, Cloudflare Pages, Vercel, własny nginx). Skopiuj zawartość `dist/` do katalogu publicznego. Ścieżki są względne, więc działa też w podkatalogu.
Service worker wymaga HTTPS (lub `localhost`). Po pierwszym wczytaniu aplikacja działa offline.

### Instalacja na telefonie
- iPhone: Safari → Udostępnij → „Do ekranu początkowego”.
- Android/Chrome: menu → „Zainstaluj aplikację”.

## Architektura

```
src/
  core/      typy domenowe, IndexedDB (Storage), store (stan poza Reactem), i18n, audio/wibracje/głos
  data/      baza ćwiczeń (108 pełnych rekordów), katalog postawy, mięśnie, kształty atlasu, animacje (47), rutyny, szablony
  engine/    CZYSTA logika bez UI: generator planu, silnik treningu, timery, statystyki, progresja, silnik pozy 2D (IK)
  ui/        komponenty, wykresy SVG, Figure (animacja techniki), Atlas (mięśnie SVG)
  screens/   Pulpit, Plan, Ćwiczenia (+karta, atlas, programy, timery), Trening, Postępy, Ustawienia, Onboarding
tests/       testy jednostkowe danych i silników
e2e/         testy end-to-end w prawdziwej przeglądarce
```

Najważniejsze decyzje:
- **Logika oddzielona od UI** (`engine/`) — testowalna bez przeglądarki.
- **Timery liczone ze znaczników czasu** (nie z ticków), więc po uśpieniu/powrocie z tła pokazują poprawny czas.
- **Szkic treningu zapisywany do IndexedDB po każdej zmianie** — odświeżenie strony nie gubi postępu (test e2e).
- **Animacje**: schematyczna figura 2D (widok z boku) sterowana celami (biodro, dłoń, stopa) i IK dwóch kości, więc długości kończyn są zawsze zachowane (test). Ćwiczenia bez animacji pokazują uczciwy komunikat „Brak animacji”; pozy statyczne są oznaczone jako statyczne.
- **Generator planu jest regułowy i lokalny** (nie „AI”): deterministyczny (ziarno), zapisuje swoje parametry w planie (`generatedFrom`).
- **Ograniczenia/kontuzje** to proste filtrowanie ćwiczeń po flagach (np. ciężar na kolana/kręgosłup) — nie jest to porada medyczna.

## Co jest zaimplementowane

Pełna lista, w tym ograniczenia — patrz sekcja „Stan wdrożenia” niżej.

## Profile (3)
Aplikacja obsługuje **3 profile** na jednym urządzeniu (przycisk z numerem i imieniem w nagłówku Pulpitu albo Ustawienia → Zmień profil). Każdy profil ma osobną bazę IndexedDB: plany, historię, pomiary, szkic treningu, własne zestawy i ustawienia (motyw, język). Profil 1 to dotychczasowa baza, więc istniejące dane zostają. Wybrany profil jest zapamiętywany. Pusty profil zaczyna od onboardingu. „Usuń dane tego profilu” i eksport/import dotyczą tylko aktywnego profilu. To nie są konta: dane nie są chronione hasłem i każdy z urządzenia może przełączyć profil.

## Sekcje „Kręgosłup” i „Rozciąganie”
Dwie osobne sekcje (Pulpit → Szybkie akcje albo Ćwiczenia → u góry listy), obie z tym samym edytorem: wybór ćwiczeń, suwaki konfiguracji i **własne zestawy** (nazwa, zapis, wczytanie, usunięcie — osobno dla każdej sekcji i profilu). Rozciąganie ma filtry: Biodra, Plecy i tułów, Nogi, Kark i ramiona, Oddech.

### Kręgosłup (lordoza, skolioza)
- 21 ćwiczeń: 10 nowych (przechył miednicy, aktywacja głębokiego brzucha, stanie przy ścianie, skłon boczny w siadzie, oddychanie w boczne żebra, „W” leżąc przodem, odwodzenie nogi, stanie na jednej nodze, ściąganie łopatek, kolana do klatki) + 11 istniejących wybranych pod ten cel (m.in. dead bug, bird dog, mostek, rozciąganie zginaczy biodra).
- Filtr Lordoza / Skolioza / Wszystkie, zestaw rekomendowany, własny wybór ćwiczeń i zestawy własne.
- Dla każdego wybranego ćwiczenia suwaki: serie, tryb **powtórzenia albo czas**, liczba powtórzeń, **utrzymanie w powtórzeniu** (s), czas ćwiczenia (s), przerwa. Ustawienia zapamiętują się.
- „Rozpocznij sesję” uruchamia zwykły aktywny trening (z przerwami i zapisem w historii), „Zapisz w planie” dodaje zestaw do wybranego dnia aktywnego planu. W planie można później zmienić także utrzymanie.
- Ćwiczenia niewskazane przy danym problemie nie trafiają do zestawu rekomendowanego (np. „W” leżąc przodem przy lordozie).
- **To nie jest terapia ani diagnoza.** Aplikacja nie rozpoznaje rodzaju ani stopnia skoliozy; nie dobiera strony ani dawki. Przy skoliozie plan powinien zatwierdzić fizjoterapeuta. Moduł nie jest częścią generatora planów.
- Ograniczenia: animacje mają tylko 2 z 10 nowych ćwiczeń (przechył miednicy, stanie przy ścianie); utrzymanie pozycji jest wskazówką tekstową w treningu (bez osobnego odliczania na każde powtórzenie); strona w ćwiczeniach „na każdą stronę” nie jest konfigurowana osobno.

## Motyw „Kulki”
Domyślny motyw (Ustawienia → Wygląd → Kulki), stylizowany na trójwymiarowy tor z kulkami: błękitne tło, granatowe wyżłobione karty, różowe i żółto-pomarańczowe kapsuły, suwaki z srebrnymi kulkami, przełączniki z różowym półkolem. Kontrast tekstu sprawdzany testem (WCAG AA). Motywy Ciemny, Jasny i Systemowy nadal są dostępne; dotychczasowi użytkownicy zachowują swój wybór.

## Stan wdrożenia i ograniczenia (uczciwie)

**Działa i jest przetestowane**
- Onboarding (9 kroków, wszystko dobrowolne), profil, edycja profilu, motyw ciemny/jasny/systemowy, język PL/EN (interfejs).
- 5 modułów: siłownia, dom, kettlebell (15 wymaganych ćwiczeń), stretching i mobilność (dynamiczne / statyczne / aktywne / PNF / mobilizacje / aktywacje / oddech). Baza: **108 pełnych rekordów** (cel etapu 1: ≥60; cel docelowy 150 — niezrealizowany).
- Wyszukiwarka i filtry (nazwa bez polskich znaków, mięsień, sprzęt, poziom, czas, miejsce); karta ćwiczenia z krokami, wskazówkami, błędami, oddechem, bezpieczeństwem, alternatywami i wynikami.
- Atlas mięśni SVG (przód/tył, kobieta/mężczyzna jako proporcje sylwetki, 20 mięśni), dotknięcie → ćwiczenia, filtr „mój sprzęt”, dodanie do treningu/planu. Mięsień główny/pomocniczy na karcie ćwiczenia.
- Aktywny trening: serie/powtórzenia/ciężar/czas, automatyczna przerwa, pauza, pomijanie, edycja serii, dodawanie serii/ćwiczeń, poprzedni wynik, propozycja progresji (max ~5% naraz), zakończenie z RPE/samopoczuciem/notatką/dystansem, rekordy, odzyskiwanie po odświeżeniu.
- Timery (zakładka Ćwiczenia → Timery, obok Listy, Atlasu i Programów): stoper (okrążenia), odliczanie, odpoczynek, Tabata, EMOM, AMRAP (ręczny licznik rund), interwały, rozciąganie ze zmianą strony; dźwięk/głos/wibracje opcjonalnie; prowadzona sesja stretchingu z animacją bieżącej pozycji i zapisem do historii.
- Plan tygodnia: widok pon–nd w dużych kafelkach z datą (dziś wyróżniony), eksport do kalendarza telefonu (plik .ics: cotygodniowe wydarzenia z godziną, przypomnieniem i listą ćwiczeń; późniejsze zmiany planu nie aktualizują kalendarza), edycja dni, kolejność ćwiczeń przeciąganiem (uchwyt ⋮⋮) lub strzałkami, serie/powtórzenia/przerwy, kopiowanie i zamiana dni, przesunięcie planu, wiele planów (aktywny, nazwa, kopia, usuwanie), 7 szablonów, generator z zapisem parametrów i podglądem.
- Postępy: wykresy tygodniowe (treningi, objętość, serie, czas, mobilność), regularność (heatmapa), rekordy, historia ćwiczenia, historia treningów, własne pomiary zakresu ruchu (czas rozciągania nie jest traktowany jako miara elastyczności).
- Dane: eksport JSON (pełna kopia) i CSV, import z walidacją, reset planów, usunięcie wszystkich danych.
- PWA: manifest, ikony (w tym maskable), service worker z precache, działanie offline (test e2e).
- Dostępność: etykiety ARIA, role, duże cele dotykowe (≥44–52 px), kontrasty sprawdzone liczbowo (AA), `prefers-reduced-motion`, ekrany nakładkowe blokują spód (`inert`), Escape zamyka.

**Nie działa / nie zaimplementowane**
- **Synchronizacja z chmurą (Supabase)** — brak. Jest tylko wyraźna informacja w ustawieniach; przenoszenie danych przez eksport/import JSON. Nie udajemy synchronizacji.
- **HealthKit** — niedostępny dla PWA; nie symulowany.
- **Licznik powtórzeń z kamery i widok 3D** — brak (zgodnie ze specyfikacją tylko „przygotowana struktura”: dane atlasu są oddzielone od renderu).
- **Widok boczny atlasu** — pominięty (opcjonalny).
- **Animacje**: 47 ćwiczeń z animacją/pozą; pozostałe (m.in. Turkish get-up, windmill, maszyny, wyciągi, wiele ćwiczeń na barki) mają tylko opis tekstowy i widoczny komunikat. Animacje są schematyczne (2D), nie nagraniami.
- **Treść ćwiczeń po angielsku** — tłumaczony jest interfejs; opisy ćwiczeń (kroki, wskazówki) tylko po polsku.
- **„Kopiowanie tygodni”** — plan jest pojedynczym tygodniem; zrealizowano kopiowanie planu, kopiowanie/zamianę dni i przesunięcie harmonogramu, bez kalendarza wielotygodniowego.
- **Timery w tle (ograniczenia platformy)**: przeglądarki — zwłaszcza Safari/iOS — wstrzymują aplikację w tle. Czas jest zawsze poprawny po powrocie, ale dźwięk/głos w tle nie jest gwarantowany; wibracje nie działają na iOS Safari. Aplikacja prosi o blokadę wygaszania ekranu (Wake Lock) tam, gdzie jest dostępna. Uruchomiony timer (poza treningiem) nie przeżywa odświeżenia strony — przeżywa je szkic treningu.
- Pomiar sekund pojedynczej serii „na czas” w aktywnym treningu zeruje się po odświeżeniu (serie już zaznaczone zostają).

**Użyte narzędzia vs. specyfikacja** — środowisko budowania nie miało dostępu do sieci i brakowało części pakietów, więc zamiast: Vite → **esbuild**; Tailwind → **ręcznie pisany CSS ze zmiennymi**; Recharts → **własne wykresy SVG**; lucide-react → **react-icons/lu** (te same ikony Lucide, importy w jednym pliku `src/ui/icons.ts`); idb → **własna cienka nakładka na IndexedDB**; Supabase → pominięty. Typy `@types/react` nie były dostępne, więc sprawdzanie typów UI jest ograniczone (`tsconfig.check.json` + shim); po `npm install @types/react @types/react-dom` usuń `src/types/shim.d.ts` i użyj `tsconfig.json`.

## Bezpieczeństwo treningu
FORM+ nie zastępuje trenera, fizjoterapeuty ani lekarza i nie diagnozuje. Przy bólu (innym niż zmęczenie mięśni), drętwieniu, zawrotach głowy lub urazie przerwij ćwiczenie i skonsultuj się ze specjalistą. Rozciągaj do łagodnego napięcia, nigdy przez ból. Domyślną rozgrzewką są wyłącznie ćwiczenia dynamiczne. Progresja obciążenia nie przekracza ok. 5% naraz.
