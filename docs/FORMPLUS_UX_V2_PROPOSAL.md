# FORM+ 2.0 — koncepcja logiki treningowej i UX (PROPOZYCJA)

**Data:** 2026-11-10  
**Status:** propozycja do omówienia, bez zmian w aplikacji produkcyjnej  
**Repozytorium:** wyłącznie `Auriol-kno/Zdrowie`  
**Punkt startowy:** `main` @ `8bd4a2ae18584ea1a3bdc1ff4efb3d9a755e43bc`  
**Zabezpieczenie obecnej wersji:** gałąź `backup/formplus-v1-before-ux-v2-2026-11-10` z tego commitu.

## 1. Cel produktu

Użytkownik ma móc rozpocząć dobry, dostosowany do możliwości trening w **1–2 dotknięciach**, a jednocześnie w trybie zaawansowanym kontrolować serię, obciążenie, RPE/RIR, tempo, odpoczynek, superserie i historię. FORM+ nie ma stawać się przeładowanym panelem trenera.

Trzy zasady:
1. **Dziś — decyzja — działanie.** Jeden wyraźny proponowany trening, jego czas, sprzęt, cel i przycisk START.
2. **Dostosuj bez utraty planu.** Skróć, zamień sprzęt, przesuń dzień, wybierz trening spontaniczny albo sesję mobilności bez usuwania planu głównego.
3. **Pokaż dlaczego.** Lokalne, objaśnione reguły rekomendacji; bez udawania modelu AI lub diagnozy.

Inspiracje funkcjonalne: szybki dziennik serii, superserie i RPE z Hevy; dopasowanie do sprzętu i preferencji z Fitbod. Nie kopiować interfejsu ani treści konkurencji.

## 2. Co obecnie działa i zostaje

Zgodnie z README i kodem (stan 2026-11-10):
- React 19/TS, esbuild, CSS, PWA offline-first, 3 niezależne lokalne profile IndexedDB, PL/EN interfejs.
- 108 ćwiczeń, 47 póz/animacji SVG; biblioteka, atlas, dom/siłownia/kettlebell/mobilność.
- Plan 7-dniowy, generator regułowy `src/engine/generator.ts`, zapis szkicu treningu i historii, timery, RPE, progresja.
- Oddzielenie `engine/`, `core/`, `data/`, `screens/`, `ui/`.
- Ekport/import JSON/CSV i istniejące testy; brak serwera ani płatnego API.

Nie nazywać funkcjami gotowymi: synchronizacji chmurowej, HealthKit, kamery, pełnego 3D, kompletnej biblioteki animacji i tłumaczeń opisów ćwiczeń.

## 3. Nowa mapa nawigacji

**Dolny pasek — cztery sekcje:**
- **Dzisiaj** — nadrzędny cel, następny trening, krótka wersja, mobilność, regularność.
- **Plan** — tydzień / nadchodzące dni / aktywny plan / edycja i generator.
- **Ćwiczenia** — wyszukiwarka, atlas mięśni, kategorie, katalog programów, własne zestawy; także Kręgosłup i Rozciąganie.
- **Postępy** — treningi, siła, zakresy, czas, historia, własne rekordy.

**Akcja główna:** na pulpicie duży START, a podczas aktywnej sesji stale dostępna belka „Trening w toku”. Zamiast oddzielnej stałej zakładki „Trening” ekran sesji działa jak tryb pełnoekranowy, z bezpiecznym powrotem. Timery specjalne: szybka akcja na pulpicie i w bibliotece.

**Hierarchia:** początkujący widzi mało decyzji; zaawansowane ustawienia są zwinięte pod „Więcej parametrów”.

## 4. Onboarding — krótsza ścieżka

Pierwsze uruchomienie: maksymalnie 4 kluczowe kroki:
1. Cel: siła / mięśnie / kondycja / zdrowy ruch / mobilność.
2. Miejsce i sprzęt: dom / siłownia / mieszany, wybór dostępnych przedmiotów.
3. Dostępność: ile dni i ile czasu; domyślnie elastyczny plan.
4. Doświadczenie + opcjonalne ograniczenia, z informacją „to nie diagnoza”.

Pozostałe parametry — imię, wiek, płeć, masa, motyw, dźwięk, preferencje ćwiczeń — edytowalne później; nie blokować wejścia do programu. Pozostawić możliwość „Zacznij bez planu”.

## 5. Inteligentny pulpit „Dzisiaj”

Jedna karta główna z:
- nazwą, celem, liczbą ćwiczeń, szacowanym czasem, wymogami sprzętowymi;
- głównym „Rozpocznij”, obok „Skróć do 20 min”, „Zmień sprzęt”, „Inny trening”;
- podsumowaniem tygodnia bez karania za opuszczone dni;
- kartą „Powrót do aktywnego treningu” nadrzędną wobec nowego startu.

Gdy plan przewiduje odpoczynek: pokaż odpoczynek + dobrowolną lekką mobilność, a nie automatycznie kolejny ciężki trening. Kiedy użytkownik opuści dzień, daj „Przenieś na jutro” bez dopisywania kolejnego obowiązku lub naruszania historii.

## 6. Personalizacja i rekomendacje (lokalne reguły, nie AI)

**Wejścia:** cel, poziom, dni i czas, miejsce, posiadany sprzęt, ograniczenia zgłoszone przez użytkownika, ostatnie sesje, preferencje ćwiczeń, ręczny „check-in” (czas/energia/samopoczucie). Nie wyciągaj medycznych wniosków z samych statystyk.

**Priorytety wyboru ćwiczeń:**
1. Bezpieczeństwo i ograniczenia (flagi `limitations`, poziom trudności, rzeczywisty sprzęt).
2. Zachowanie struktury programu i priorytetów celu.
3. Rozsądna zmienność/obciążenie w tygodniu na podstawie historii.
4. Preferencje użytkownika i zamienniki o podobnym wzorcu ruchowym.
5. Dostępny czas: usuń przede wszystkim opcjonalne dodatki, **nie** niezbędną rozgrzewkę.

**Wynik:** proponowany trening + krótkie wyjaśnienie np. „Wersja 25-minutowa, ponieważ wybrano krótszy czas; zachowano ćwiczenia podstawowe”. Użytkownik akceptuje zmianę; nie modyfikuj zapisanego szablonu po cichu.

Dodać preferencje per ćwiczenie: „Lubię”, „Rzadziej”, „Nie proponuj” (bez blokady ręcznego dodania) oraz menu zamienników. Używaj jawnych reguł z wersją algorytmu i testami.

## 7. Prowadzenie aktywnej sesji — najważniejszy ekran

Ekran sesji jako jedna kontekstowa sekwencja:
- nazwa bieżącego ćwiczenia, prosty podgląd techniki / animacja (jeśli istnieje), łatwy dostęp do pełnego opisu;
- bieżąca seria np. „2 z 4” + duże pola **kg / powtórzenia / czas** + **Zakończ serię**;
- mini-tabela: poprzedni wynik, cel dziś, serie ukończone; opcjonalne RPE/RIR i notatki;
- po serii: automatyczna przerwa z dużym licznikiem i +/- 15 s; następną serię można rozpocząć wcześniej;
- przewijana lista następnych ćwiczeń + „Zamień”, „Pomiń”, „Dodaj”, „Superseria”;
- widoczny postęp sesji, przycisk pauzy, potwierdzenie przed porzuceniem; szkic po każdej zmianie.

Obsłużyć stany: `idle -> preparing -> exercising -> resting -> paused -> finishing -> saved`, z odtwarzaniem szkicu po restarcie. Stan `paused` pamięta, czy pauza przerwała ćwiczenie czy odpoczynek.

**Tryb prosty:** tylko wynik, wielki przycisk serii i timer. **Tryb PRO:** RPE/RIR, tempo, serie rozgrzewkowe i robocze, drop set, superserie, notatki, kalkulator obciążenia. Te elementy to funkcje docelowe, nie obecne.

Nie obiecywać alarmów iOS, głosu i wibracji przy aplikacji w tle; przeglądarka może to blokować. Po powrocie czas ma być poprawny dzięki istniejącym znacznikom czasu.

## 8. Silnik planowania i progresji

Plan jako **cykl**, nie wyłącznie sztywny tydzień:
- Tydzień 1–4/6 jako planowany blok, łatwo edytowalny; w MVP można przechowywać szablon tygodnia oraz harmonogram pochodny.
- Elastyczne dni: `scheduled / completed / moved / skipped / rest` jako stan kalendarza. Nie przenosić automatycznie zaległości.
- Zastępstwa: priorytet wzorca ruchowego, celu, poziomu i dostępnego sprzętu.
- Progresja: proponuj, nie wymuszaj. Przy osiągnięciu górnego zakresu powtórzeń z odpowiednim zapasem i poprawną techniką sugeruj mały dostępny skok obciążenia (obecny limit ok. 5% zachować jako górną granicę); gdy wynik spada/energia jest niska — opcja powtórzenia lub lżejszej sesji. Nie stosować sztywnego wzrostu po każdym treningu.
- Trzy tryby programu: **Prowadzony**, **Sam układam**, **Szybki trening**.
- Świadomie wybieraj regenerację; nie etykietuj jej jako medycznie obliczonej zdolności do wysiłku.

## 9. Biblioteka, instrukcje, mobilność

Każda karta ćwiczenia: cel i mięśnie, sprzęt, poziom, kroki techniki, typowe błędy, wskazówki oddechowe, zamienniki, „Dodaj do planu” / „Rozpocznij”. Pokaż „Brak animacji” tam, gdzie nie ma kompletnego materiału.

Biblioteka ma filtry: miejsce, sprzęt, mięsień, wzorzec ruchu, czas i poziom. Szybkie programy: całe ciało, krótka sesja domowa, kettlebell, rozgrzewka, rozciąganie, mobilność.

Moduł Kręgosłup zachować, ale wyróżnić jako zestawy ruchowe o ograniczonym zastosowaniu — bez diagnozy lordozy/skoliozy i bez automatycznej terapii.

## 10. Postępy i motywacja

Wyświetlaj najpierw 3–4 czytelne wskaźniki: wykonane sesje / regularność, rekordy, aktywny czas i rozwój wybranych ćwiczeń. Zaawansowane wykresy tylko po rozwinięciu: objętość, serie na grupę, szacunkowy 1RM, rozkład obciążenia w tygodniach. Dopuszczaj korektę błędnego wpisu w historii z historią zmian, jeśli wdrożona.

Po zakończeniu sesji: prosty ekran „Gotowe” z wykonanym czasem, seriami, trendem, notatką i samopoczuciem. Możliwość „Zapisz jako własny szablon” i „Powtórz później”. Unikać komunikatów zawstydzających za przerwę w treningach.

## 11. Bezpieczne zachowanie obecnej wersji (wymaganie krytyczne)

**Już istnieje punkt powrotu:** `backup/formplus-v1-before-ux-v2-2026-11-10` wskazuje niezmieniony commit `8bd4a2ae18584ea1a3bdc1ff4efb3d9a755e43bc`. Nie usuwać ani nie przestawiać tej gałęzi.

**Kolejne wdrożenie (osobna decyzja; NIE w tym PR):**
1. Zachować kompletny klasyczny UI jako `ClassicApp` lub `src/legacy/`; nowy `NextApp` budować równolegle w `src/v2/`, wykorzystując ten sam istniejący `engine` i `store` przez adapter.
2. Wprowadzić jawny przełącznik „Interfejs: Klasyczny / FORM+ 2.0” w Ustawieniach, **domyślnie Klasyczny** do zakończenia QA. Przełącznik ma nie usuwać danych, planów ani historii.
3. Nowe, opcjonalne preferencje UX zapisywać osobno (np. namespaced `kv`), a nowe modele danych dodawać **addytywnie** z walidacją i migracją; wersję eksportu JSON zachować kompatybilną lub zapewnić import wsteczny. Nie nadpisywać istniejącego `Plan` i `SessionRecord` przy samym przełączeniu UI.
4. Przed testami przygotować eksport JSON **oddzielnie dla każdego z 3 profili**. Sam git branch NIE jest kopią prywatnej bazy IndexedDB użytkownika.
5. Trzymać wersję 2.0 na osobnych gałęziach i preview; nie publikować do `main` bez zgody użytkownika i potwierdzonych testów.
6. Test regresji: wejście klasyczne -> zapis sesji -> wejście 2.0 -> odczyt -> powrót klasyczny; także restart/PWA offline, zmiana profilu i stare pliki eksportu.
7. Ewentualny powrót do starego kodu: odtworzenie wydania z backup branch, po uprzednim zabezpieczeniu danych lokalnych. Uwaga: historyczny service worker i aktualizacja PWA wymagają osobnych testów przy wdrożeniu.

## 12. Wdrożenie etapami

| Etap | Co powstaje | Kryterium odbioru |
| --- | --- | --- |
| 0. Zabezpieczenie | Backup gałęzi, opis migracji, testy regresji | Klasyczna wersja działa; każda baza profilu może być wyeksportowana |
| 1. UX „Dzisiaj” | 4 zakładki, karta dnia, skrócenie, szybki start, przełącznik UI | Dwa tryby współistnieją, stary kod i dane nietknięte |
| 2. Trening 2.0 | Duże sterowanie serią, prosty/PRO, przerwy, superserie | Sesja, pauza i odtworzenie działają po reload/offline; testy |
| 3. Adaptacyjny plan | Alternatywy sprzętowe, elastyczne dni, preferencje i progresja | W każdej rekomendacji widać powód; użytkownik może odrzucić |
| 4. Analityka i jakość | Raporty, historia, dostępność, iOS UX, testy E2E | Przejście V1 ↔ V2 nie niszczy danych; regresje przechodzą |

### Priorytet MVP
Zrobić **etap 1 i 2 przed ambitną „AI”-personalizacją**: szybkość prowadzenia treningu ma największą wartość. Funkcje wymagające serwera lub płatnego API są poza zakresem.

## 13. Podział pracy ChatGPT / Claude

- **ChatGPT:** architektura UX, wymagania akceptacyjne, reguły, recenzje kodu i testów.
- **Claude:** implementacja na `claude/ux-v2-...` po zatwierdzeniu zakresu przez użytkownika; oddzielne PR po każdym etapie.
- **Obaj:** raporty w swoich .ai/FROM_*.md, czytanie PR i dzienników przed rozpoczęciem.
- Nie przejmować otwartego PR #2 `claude/first-report`; dotyczy raportu Claude i istniejącego błędu typecheck w martwym `Posture.tsx` (osobna sprawa).

## Inspiracje (wyłącznie funkcje, nie wzór wyglądu)

- Hevy Help Centre: https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2026-Features-Guide
- Fitbod Help: https://help.fitbod.me/hc/en-us/articles/43489509474455-How-does-Fitbod-choose-which-exercises-to-give-me

## Status
To specyfikacja projektowa. Nie zmienia `src/`, IndexedDB, wyglądu produkcji ani wdrożenia GitHub Pages. Nie wykonano tu testów kodu aplikacji.
