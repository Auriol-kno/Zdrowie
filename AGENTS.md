# FORM+ — wspólne zasady pracy agentów AI

Wspólne reguły dla ChatGPT, Claude i innych asystentów dotyczą **wyłącznie repozytorium Auriol-kno/Zdrowie**. Polecenia użytkownika oraz aktualny kod mają pierwszeństwo przed nieaktualną dokumentacją.

## Początek sesji
1. Potwierdź repozytorium: Auriol-kno/Zdrowie; nie pracuj w innych repozytoriach.
2. Odczytaj README.md, docs/ARCHITECTURE.md, .ai/README.md, .ai/STATE.md, .ai/TASKS.md, .ai/DECISIONS.md oraz oba dzienniki .ai/FROM_*.md.
3. Sprawdź bieżący main, ostatnie commity, otwarte GitHub Issues i Pull Requesty.
4. Wybierz jedno zadanie, ustal właściciela, zakres i kryteria odbioru; nie duplikuj pracy drugiego asystenta.

## Zasady kodowania i publikacji
- Twórz gałęzie chatgpt/<temat> albo claude/<temat>. Nie commituj na main, nie rób force push i nie merguj bez zgody użytkownika.
- Jeden logiczny temat na PR. Nie modyfikuj gałęzi innego asystenta; recenzuj przez GitHub PR.
- Przed PR uruchom w miarę dostępności npm test, npm run typecheck i npm run build; dla UI/PWA sprawdź odpowiednie testy E2E i iOS. Wpisuj też testy niewykonane.
- Zachowaj offline-first, zgodność danych IndexedDB, trzy profile i architekturę engine / UI. Opisy postawy nie mogą udawać diagnozy ani terapii.
- Repo jest PUBLICZNE: nie umieszczaj danych zdrowotnych użytkowników, historii treningów, kluczy API, haseł, tokenów czy danych osobowych.
- Pisz podsumowania po polsku; zachowuj spójne identyfikatory i API. Nigdy nie deklaruj funkcji ani testów jako działających bez weryfikacji.

## Komunikacja dwóch agentów
- ChatGPT dopisuje wyłącznie do .ai/FROM_CHATGPT.md, Claude wyłącznie do .ai/FROM_CLAUDE.md.
- Obaj czytają oba dzienniki na początku sesji; wiadomości zawierają datę, zadanie, gałąź/commit/PR, zakres, pliki, wyniki testów, ryzyko i następny krok.
- Wspólne .ai/STATE.md, .ai/TASKS.md i .ai/DECISIONS.md aktualizuj po sprawdzeniu kodu oraz zaakceptowanych zmian.
- GitHub Issues i PR są źródłem prawdy o zadaniach i recenzjach. Dzienniki nie są komunikatorem na żywo; żaden agent nie otrzymuje ich automatycznie.
- Szczegóły: .ai/README.md. Raportowanie: .ai/HANDOFF_TEMPLATE.md.
