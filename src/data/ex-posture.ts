import { ex } from './helper';

// MODUŁ E — POSTAWA I KRĘGOSŁUP: pogłębiona lordoza lędźwiowa i skolioza.
// Ćwiczenia ogólnorozwojowe/profilaktyczne — NIE są terapią ani diagnozą.
// Przy skoliozie dobór ćwiczeń, strony i dawkowania powinien zatwierdzić fizjoterapeuta.
const SCOL = 'Przy skoliozie dobór ćwiczeń, strony i dawkowania ustala fizjoterapeuta (np. metoda Schroth). Jeśli dostałeś(-aś) inne zalecenia, trzymaj się ich.';
const LORD = 'Przy utrzymującym się bólu pleców, drętwieniu lub promieniowaniu bólu do nogi skonsultuj się z lekarzem lub fizjoterapeutą.';

export const POSTURE = [
  ex({
    id: 'p-pelvic-tilt', pl: 'Przechył miednicy leżąc (tyłopochylenie)', en: 'Supine pelvic tilt', cat: 'posture', module: 'posture', kind: 'mobility', st: 'activation',
    p: ['abs'], s: ['glutes'], eq: ['bodyweight', 'mat'], lv: 'beginner', viz: 'pelvic_tilt', focus: ['lordosis'],
    steps: ['Połóż się na plecach, kolana ugięte, stopy na podłodze na szerokość bioder.', 'Zauważ niewielką przerwę między lędźwiami a podłogą.', 'Na wydechu napnij brzuch i lekko „podwiń” miednicę, tak by lędźwie delikatnie zbliżyły się do podłogi.', 'Utrzymaj napięcie, po czym wróć do pozycji neutralnej.'],
    cues: ['Ruch jest mały — to miednica, nie unoszenie pośladków.', 'Pośladki napinaj lekko, nie dociskaj stóp na siłę.', 'Klatka piersiowa pozostaje rozluźniona.'],
    err: ['Unoszenie pośladków i bioder z podłogi.', 'Wstrzymywanie oddechu.', 'Przesadne dociskanie lędźwi — celem jest kontrola, nie maksymalny zakres.'],
    safe: [LORD], br: 'Wydech przy przechyle, spokojny wdech przy powrocie.', sch: { sets: 2, reps: [10, 12], rest: 30 },
    alt: ['p-tra-activation', 'home-glute-bridge'], tags: ['lordoza', 'miednica', 'brzuch'],
  }),
  ex({
    id: 'p-tra-activation', pl: 'Aktywacja głębokiego brzucha (wciąganie brzucha)', en: 'Deep core activation', cat: 'posture', module: 'posture', kind: 'timed', st: 'activation',
    p: ['abs'], s: ['obliques'], eq: ['bodyweight', 'mat'], lv: 'beginner', focus: ['lordosis', 'scoliosis'],
    steps: ['Połóż się na plecach, kolana ugięte, kręgosłup w pozycji neutralnej.', 'Wydychając powietrze, delikatnie wciągnij brzuch, jakbyś zapinał(-a) wąskie spodnie (ok. 30% maksymalnego napięcia).', 'Utrzymaj napięcie, oddychając spokojnie i płytko.', 'Rozluźnij brzuch i powtórz.'],
    cues: ['Napięcie jest lekkie — rozmawiać dałoby się bez trudu.', 'Żebra nie unoszą się w górę, lędźwie nie zmieniają ustawienia.'],
    err: ['Zbyt mocne napinanie i zatrzymanie oddechu.', 'Wciąganie klatki piersiowej zamiast brzucha.'],
    safe: [LORD], br: 'Oddychaj spokojnie, nie wstrzymuj oddechu.', sch: { sets: 3, seconds: 20, rest: 20 },
    alt: ['p-pelvic-tilt', 'home-dead-bug'], tags: ['core', 'stabilizacja'],
  }),
  ex({
    id: 'p-knees-to-chest', pl: 'Kolana do klatki (rozluźnienie lędźwi)', en: 'Knees to chest', cat: 'posture', module: 'posture', kind: 'stretch', st: 'static',
    p: ['lower_back'], s: ['glutes'], eq: ['bodyweight', 'mat'], lv: 'beginner', focus: ['lordosis'],
    steps: ['Połóż się na plecach.', 'Obejmij jedno kolano dłońmi i delikatnie przyciągnij do klatki (albo oba kolana naraz).', 'Utrzymaj pozycję, pozwalając lędźwiom się rozluźnić.', 'Opuść nogę i zmień stronę.'],
    cues: ['Głowa i barki rozluźnione na podłodze.', 'Przyciągaj łagodnie — bez szarpania.'],
    err: ['Szarpanie nogi do klatki.', 'Unoszenie głowy i napinanie szyi.'],
    safe: [LORD], br: 'Wydech pogłębia rozluźnienie.', sch: { sets: 2, seconds: 30, rest: 15, perSide: true },
    alt: ['m-childs-pose', 'm-supine-twist'], tags: ['lordoza', 'lędźwie', 'rozciąganie'],
  }),
  ex({
    id: 'p-wall-stance', pl: 'Stanie przy ścianie — wydłużenie osiowe', en: 'Wall stance with axial elongation', cat: 'posture', module: 'posture', kind: 'timed', st: 'active',
    p: ['abs', 'mid_back'], eq: ['bodyweight'], lv: 'beginner', viz: 'wall_stance', focus: ['lordosis', 'scoliosis'],
    steps: ['Stań plecami do ściany, pięty ok. 10 cm od niej, tył głowy, łopatki i pośladki dotykają ściany.', 'Lekko podwiń miednicę, aby lędźwie zbliżyły się do ściany (bez wciskania).', 'Wydłuż się w górę, jakby czubek głowy był delikatnie ciągnięty do sufitu; broda lekko cofnięta.', 'Utrzymaj pozycję i spokojnie oddychaj.'],
    cues: ['Dłoń włożona między lędźwie a ścianę powinna mieć lekki luz, nie duży.', 'Żebra „zamknięte”, nie wypchnięte do przodu.', 'Przy skoliozie ustawienie dopasuj do zaleceń fizjoterapeuty.'],
    err: ['Wciskanie lędźwi w ścianę na siłę.', 'Unoszenie brody lub odchylanie głowy.', 'Zablokowane kolana.'],
    safe: [SCOL, LORD], br: 'Oddech spokojny, w stronę boków i tyłu klatki.', sch: { sets: 3, seconds: 30, rest: 20 },
    alt: ['p-scap-squeeze', 'p-single-leg-stance'], tags: ['postawa', 'ściana', 'samokontrola'],
  }),
  ex({
    id: 'p-seated-side-bend', pl: 'Skłon boczny w siadzie (rozciąganie boku tułowia)', en: 'Seated side bend', cat: 'posture', module: 'posture', kind: 'stretch', st: 'static',
    p: ['obliques'], s: ['lats'], eq: ['bodyweight'], lv: 'beginner', focus: ['scoliosis'],
    steps: ['Usiądź prosto na krześle lub macie, obie kości siedzeniowe ciężarem dociśnięte do podłoża.', 'Jedną rękę oprzyj na boku, drugą wyciągnij w górę.', 'Pochyl tułów w bok, wydłużając bok ciała, zamiast zapadać się w talii.', 'Utrzymaj, wróć do środka i zmień stronę (lub wykonaj tylko stronę zaleconą przez fizjoterapeutę).'],
    cues: ['Wydłużaj się w górę zanim pochylisz się w bok.', 'Barki rozluźnione, miednica stabilna.'],
    err: ['Skręcanie tułowia zamiast ruchu w bok.', 'Wciskanie się w ból.'],
    safe: [SCOL + ' Przy skoliozie boki bywają niesymetryczne — to ćwiczenie może wymagać innej dawki na każdą stronę.'],
    br: 'Wdech wydłuża, wydech pogłębia pochylenie.', sch: { sets: 2, seconds: 25, rest: 15, perSide: true },
    alt: ['m-seated-twist', 'm-thread-needle'], tags: ['skolioza', 'tułów', 'rozciąganie'],
  }),
  ex({
    id: 'p-lateral-breath', pl: 'Oddychanie w boczne żebra', en: 'Lateral rib breathing', cat: 'posture', module: 'posture', kind: 'breath', st: 'breathing',
    p: ['obliques'], s: ['abs'], eq: ['bodyweight'], lv: 'beginner', focus: ['scoliosis'],
    steps: ['Usiądź lub połóż się wygodnie, dłonie połóż na bokach dolnych żeber.', 'Wdychaj nosem tak, by żebra rozszerzały się w boki pod dłońmi.', 'Wydychaj powoli ustami, czując, jak żebra się zbliżają.', 'Jeśli fizjoterapeuta zalecił „wypełnianie” konkretnej strony, kieruj oddech zgodnie z jego instrukcją.'],
    cues: ['Ramiona rozluźnione — nie unoszą się przy wdechu.', 'Oddech cichy i spokojny.'],
    err: ['Unoszenie barków przy wdechu.', 'Zbyt głębokie, gwałtowne oddechy (zawroty głowy).'],
    safe: ['Przy zawrotach głowy lub mrowieniu wróć do normalnego oddechu.', SCOL], br: 'To jest ćwiczenie oddechowe: wdech 4 s, wydech 6 s.', sch: { sets: 2, reps: [8, 10], rest: 20 },
    alt: ['m-diaphragmatic', 'm-breath-46'], tags: ['oddech', 'skolioza', 'żebra'],
  }),
  ex({
    id: 'p-prone-w', pl: 'Unoszenie ramion w układzie „W” leżąc przodem', en: 'Prone W raise', cat: 'posture', module: 'posture', kind: 'bodyweight',
    p: ['mid_back', 'rear_delts'], s: ['traps'], eq: ['bodyweight', 'mat'], lv: 'beginner', focus: ['scoliosis'], avoid: ['lordosis'],
    steps: ['Połóż się na brzuchu na macie, czoło oparte na dłoniach lub ręczniku, ramiona ugięte w układzie „W”.', 'Delikatnie napnij brzuch, aby chronić lędźwie.', 'Ściągnij łopatki i unieś łokcie lekko nad podłogę, klatka piersiowa niemal pozostaje na macie.', 'Opuść powoli i powtórz.'],
    cues: ['Ruch pochodzi z łopatek, nie z lędźwi.', 'Szyja w przedłużeniu kręgosłupa.'],
    err: ['Odchylanie klatki i lędźwi do góry.', 'Unoszenie głowy.'],
    safe: ['Przy pogłębionej lordozie to ćwiczenie jest NIEWSKAZANE (leżenie na brzuchu pogłębia lordozę) — zamiast niego wybierz „Ścianę W” lub ściąganie łopatek w staniu.', SCOL],
    br: 'Wydech przy unoszeniu.', sch: { sets: 2, reps: [8, 12], rest: 30 },
    alt: ['p-scap-squeeze', 'm-wall-slides'], tags: ['plecy', 'łopatki', 'skolioza'],
    contra: 'Niewskazane przy pogłębionej lordozie i bólu lędźwi.',
  }),
  ex({
    id: 'p-side-leg-raise', pl: 'Unoszenie nogi leżąc bokiem (odwodzenie)', en: 'Side-lying leg raise', cat: 'posture', module: 'posture', kind: 'bodyweight',
    p: ['glutes'], s: ['obliques'], eq: ['bodyweight', 'mat'], lv: 'beginner', focus: ['lordosis', 'scoliosis'],
    steps: ['Połóż się na boku, dolna noga ugięta dla stabilizacji, górna prosta w linii tułowia.', 'Lekko napnij brzuch, miednica ustawiona pionowo.', 'Unieś górną nogę na wysokość ok. 30–40 cm, nie obracając miednicy.', 'Opuść powoli.'],
    cues: ['Palce stopy lekko w dół lub równolegle do podłogi.', 'Miednica się nie przetacza do tyłu.'],
    err: ['Przetaczanie miednicy do tyłu.', 'Zbyt wysokie uniesienie z wyginaniem w lędźwiach.'],
    safe: [LORD], br: 'Wydech przy unoszeniu.', sch: { sets: 2, reps: [10, 12], rest: 30, perSide: true },
    alt: ['m-clamshell', 'home-side-plank'], tags: ['miednica', 'pośladki'],
  }),
  ex({
    id: 'p-single-leg-stance', pl: 'Stanie na jednej nodze z kontrolą miednicy', en: 'Single-leg stance', cat: 'posture', module: 'posture', kind: 'timed', st: 'active',
    p: ['glutes'], s: ['obliques', 'calves'], eq: ['bodyweight'], lv: 'beginner', focus: ['lordosis', 'scoliosis'],
    steps: ['Stań blisko ściany lub stabilnego oparcia (dla bezpieczeństwa).', 'Przenieś ciężar na jedną nogę i unieś drugą kilka centymetrów.', 'Utrzymaj poziom miednicy (kości biodrowe na jednej wysokości) i wydłużony kręgosłup.', 'Po zadanym czasie zmień nogę.'],
    cues: ['Wyobraź sobie, że miednica to pełna szklanka wody.', 'Kolano nośnej nogi lekko ugięte, nie zablokowane.'],
    err: ['Opadanie miednicy po stronie unoszonej nogi.', 'Pochylanie tułowia w bok.'],
    safe: ['Przy zaburzeniach równowagi trzymaj się oparcia.'], br: 'Oddychaj spokojnie.', sch: { sets: 2, seconds: 20, rest: 15, perSide: true },
    alt: ['p-wall-stance', 'p-side-leg-raise'], tags: ['równowaga', 'miednica'],
  }),
  ex({
    id: 'p-scap-squeeze', pl: 'Ściąganie łopatek w staniu', en: 'Standing scapular squeeze', cat: 'posture', module: 'posture', kind: 'bodyweight',
    p: ['mid_back'], s: ['rear_delts', 'traps'], eq: ['bodyweight'], lv: 'beginner', focus: ['scoliosis', 'lordosis'],
    steps: ['Stań prosto, ramiona rozluźnione, łokcie ugięte przy bokach.', 'Delikatnie napnij brzuch, żeby nie wyginać lędźwi.', 'Ściągnij łopatki ku sobie i lekko w dół, jakbyś chciał(-a) schować je w tylnych kieszeniach.', 'Utrzymaj i rozluźnij.'],
    cues: ['Barki nie idą w stronę uszu.', 'Klatka piersiowa nie wypycha się do przodu.'],
    err: ['Wypychanie żeber i wyginanie lędźwi.', 'Podciąganie barków.'],
    safe: [SCOL], br: 'Wydech przy ściąganiu łopatek.', sch: { sets: 2, reps: [10, 12], rest: 20 },
    alt: ['home-band-pull-apart', 'm-wall-slides'], tags: ['łopatki', 'postawa'],
  }),
];
