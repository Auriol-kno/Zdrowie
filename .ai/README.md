# FORM+ — protokół wymiany informacji ChatGPT ↔ Claude

Te pliki zapisują stan projektu pomiędzy niezależnymi sesjami, wyłącznie w Auriol-kno/Zdrowie.

| Plik | Funkcja | Kto edytuje |
| --- | --- | --- |
| ../AGENTS.md | Wspólne reguły | Po uzgodnieniu |
| ../CLAUDE.md | Instrukcje Claude | Po uzgodnieniu |
| STATE.md | Aktualny stan produktu | Obaj po weryfikacji |
| TASKS.md | Indeks Issues / PR | Obaj po weryfikacji |
| DECISIONS.md | Rejestr decyzji | Obaj po akceptacji |
| FROM_CHATGPT.md | Wiadomości dla Claude | Tylko ChatGPT |
| FROM_CLAUDE.md | Wiadomości dla ChatGPT | Tylko Claude |
| HANDOFF_TEMPLATE.md | Format raportów | Wspólny |
| PROMPTS.md | Polecenia do wznowienia sesji | Wspólny |
| CHANGELOG.md | Historia procesu | Wspólny |

## Przebieg sesji
1. Zsynchronizuj main, sprawdź commity, Issues, otwarte PR i testy.
2. Przeczytaj README, architekturę, STATE, TASKS, DECISIONS oraz dwa dzienniki.
3. Ustal odpowiedzialnego agenta; drugi jest recenzentem. Jedno zadanie = jedna gałąź i jeden PR.
4. Przed pracą załóż chatgpt/<temat> lub claude/<temat> od aktualnego main.
5. Wprowadź zmiany, uruchom testy, dołącz wpis do własnego dziennika i otwórz PR.
6. Drugi agent komentuje PR; merge dopiero po zgodzie użytkownika.
7. Po merge odśwież wspólne podsumowania, jeśli zmiana jest istotna.

## Konflikty i bezpieczeństwo
- Nie nadpisuj cudzego dziennika ani gałęzi.
- W razie konfliktu w STATE/TASKS pobierz aktualny main i ręcznie połącz informacje.
- Nie przedstawiaj wiadomości drugiego asystenta jako zweryfikowanych bez sprawdzenia kodu.
- Repo jest publiczne. Zabronione dane zdrowotne, prywatne historie treningów, tokeny i hasła.

## Ograniczenia
Dzienniki aktualizują się dopiero po commitach i scaleniu/odczycie gałęzi; nie istnieje automatyczne przekazywanie wiadomości ani uruchamianie drugiego modelu. Claude wymaga osobnego dostępu do tego repozytorium.
