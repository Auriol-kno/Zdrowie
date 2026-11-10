import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, phaseAt, idleRun, startRun, pauseRun, elapsedMs } from '../src/engine/timer';
import { startDraft, completeSet, togglePause, skipExercise, finishDraft, restRemainingSec, nextCursor, isFinished, addRest, skipRest } from '../src/engine/workout';
import { generatePlan, itemFor, dayMinutes } from '../src/engine/generator';
import { buildTemplatePlan, TEMPLATES } from '../src/data/templates';
import { activeStreak, personalRecords, newRecords, weeklySeries, lastPerformance, epley, sessionVolume } from '../src/engine/stats';
import { suggestNext, MAX_JUMP_PCT } from '../src/engine/progression';
import { memoryStorage } from '../src/core/db';
import { getEx, EXERCISES } from '../src/data/exercises';
import type { GeneratorInput, SessionRecord, PlanItem } from '../src/core/types';
import { dateKey } from '../src/core/time';

const input = (o: Partial<GeneratorInput> = {}): GeneratorInput => ({
  goal: 'muscle', level: 'intermediate', days: 4, minutes: 60, equipment: ['bodyweight', 'mat', 'dumbbells', 'band', 'kettlebell', 'bench', 'pullup_bar', 'barbell', 'rack', 'machine', 'cable', 'step'],
  location: 'gym', preferred: [], limitations: [], withWarmup: true, withCooldown: true, withMobilityDays: true, recentExerciseIds: [], seed: 42, ...o,
});

// ——— TIMERY ———
test('Tabata: 8 rund 20/10, brak odpoczynku po ostatniej pracy, łącznie 4:00 + przygotowanie', () => {
  const s = buildSchedule({ mode: 'tabata', prep: 0 });
  assert.equal(s.filter((p) => p.kind === 'work').length, 8);
  assert.equal(s.reduce((n, p) => n + p.sec, 0), 8 * 20 + 7 * 10);
  assert.equal(s[s.length - 1].kind, 'work');
});

test('EMOM 10 min = 600 s; AMRAP i interwały', () => {
  assert.equal(buildSchedule({ mode: 'emom', minutes: 10, work: 40, prep: 0 }).reduce((n, p) => n + p.sec, 0), 600);
  const am = buildSchedule({ mode: 'amrap', seconds: 720, prep: 0 });
  assert.equal(am.length, 1); assert.equal(am[0].sec, 720);
  const iv = buildSchedule({ mode: 'intervals', work: 40, rest: 20, rounds: 5, prep: 0 });
  assert.equal(iv.length, 9);
});

test('timer stretchingu: strona 1, zmiana strony, strona 2', () => {
  const s = buildSchedule({ mode: 'stretch', prep: 0, switchSec: 5, positions: [{ label: 'Biodra', sec: 30, perSide: true }, { label: 'Plecy', sec: 20 }] });
  assert.deepEqual(s.map((p) => p.sec), [30, 5, 30, 20]);
  assert.equal(s[0].next, 'Biodra — strona 2');
});

test('phaseAt wyznacza fazę na podstawie czasu (także po "powrocie z tła")', () => {
  const s = buildSchedule({ mode: 'tabata', prep: 0 });
  assert.equal(phaseAt(s, 0).phase?.kind, 'work');
  assert.equal(phaseAt(s, 21_000).phase?.kind, 'rest');
  assert.equal(phaseAt(s, 21_000).remaining, 9);
  const jump = phaseAt(s, 95_000); // przeskok o 95 s naraz
  assert.equal(jump.index, 6); // fazy: praca 0–20, odp. 20–30, … praca 90–110 → indeks 6
  assert.equal(phaseAt(s, 9999_000).finished, true);
});

test('stan timera: pauza nie zalicza czasu, wznowienie kontynuuje', () => {
  let r = startRun(idleRun(), 1000);
  assert.equal(elapsedMs(r, 4000), 3000);
  r = pauseRun(r, 4000);
  assert.equal(elapsedMs(r, 60_000), 3000);
  r = startRun(r, 60_000);
  assert.equal(elapsedMs(r, 62_000), 5000);
});

// ——— SESJA ———
const items: PlanItem[] = [
  { exId: 'kb-goblet-squat', sets: 2, reps: [10, 12], rest: 60, weight: 16 },
  { exId: 'kb-row', sets: 2, reps: [8, 12], rest: 45, weight: 12 },
];

test('seria: zapis wyników, auto-odpoczynek, przejście do następnej serii i ćwiczenia', () => {
  let d = startDraft({ title: 'T', items }, 0);
  assert.equal(d.items[0].sets[0].targetReps, 11);
  d = completeSet(d, { reps: 12, weight: 16 }, { autoRest: true, now: 1000 });
  assert.equal(d.items[0].sets[0].done, true);
  assert.equal(d.items[0].sets[0].reps, 12);
  assert.deepEqual([d.itemIdx, d.setIdx], [0, 1]);
  assert.equal(restRemainingSec(d, 1000), 60);
  assert.equal(restRemainingSec(d, 31_000), 30);
  assert.equal(restRemainingSec(d, 100_000), 0);
  d = completeSet(d, { reps: 11, weight: 16 }, { autoRest: true, now: 70_000 });
  assert.deepEqual([d.itemIdx, d.setIdx], [1, 0]);
  assert.ok(restRemainingSec(d, 70_000) <= 60);
});

test('pauza przesuwa odpoczynek i nie liczy się do czasu aktywnego', () => {
  let d = startDraft({ title: 'T', items }, 0);
  d = completeSet(d, {}, { autoRest: true, now: 1000 });
  d = togglePause(d, 11_000);
  assert.equal(restRemainingSec(d, 500_000), 50); // zamrożone
  d = togglePause(d, 111_000);
  assert.equal(restRemainingSec(d, 111_000), 50);
  const rec = finishDraft(d, {}, 121_000);
  assert.equal(rec.durationSec, 21); // 121 s − 100 s pauzy
});

test('pominięcie ćwiczenia, dodanie odpoczynku, zakończenie', () => {
  let d = startDraft({ title: 'T', items }, 0);
  d = skipExercise(d, 10);
  assert.equal(d.itemIdx, 1);
  d = addRest(d, 15, 1000); assert.equal(restRemainingSec(d, 1000), 15);
  d = skipRest(d); assert.equal(restRemainingSec(d, 1000), 0);
  d = completeSet(d, {}, { autoRest: false, now: 20 }); d = completeSet(d, {}, { autoRest: false, now: 30 });
  assert.equal(isFinished(d), true);
  assert.equal(nextCursor(d), null);
  const rec = finishDraft(d, { rpe: 7, mood: 4, notes: 'ok' }, 40);
  assert.equal(rec.items.length, 1); // pominięte ćwiczenie bez wykonanych serii nie trafia do historii
  assert.equal(rec.rpe, 7);
});

test('szkic sesji przetrwa „odświeżenie” (zapis/odczyt z magazynu)', async () => {
  const st = memoryStorage();
  let d = startDraft({ title: 'T', items }, 0);
  d = completeSet(d, { reps: 12, weight: 16 }, { autoRest: true, now: 1000 });
  await st.put('kv', d, 'draft');
  const back = await st.get<typeof d>('kv', 'draft');
  assert.deepEqual(back, d);
  assert.equal(restRemainingSec(back!, 31_000), 30);
});

// ——— GENERATOR ———
test('generator jest deterministyczny dla tego samego seed i odtwarzalny z zapisanych danych', () => {
  const a = generatePlan(input(), 'x', 1); const b = generatePlan(input(), 'x', 2);
  assert.deepEqual(a.days, b.days);
  const c = generatePlan({ ...a.generatedFrom! } as GeneratorInput, 'x', 3);
  assert.deepEqual(a.days, c.days);
  assert.notDeepEqual(a.days, generatePlan(input({ seed: 7 }), 'x', 1).days);
  assert.equal(a.generatedFrom?.version, 1);
});

test('generator: liczba dni treningowych, regeneracja (brak 3 ciężkich dni z rzędu przy ≤4 dniach)', () => {
  for (let days = 1; days <= 6; days++) {
    const p = generatePlan(input({ days }));
    assert.equal(p.days.filter((d) => d.kind === 'workout').length, days, `dni=${days}`);
    assert.equal(p.days.length, 7);
    if (days <= 4) {
      for (let i = 0; i < 5; i++) assert.ok(!(p.days[i].kind === 'workout' && p.days[i + 1].kind === 'workout' && p.days[i + 2].kind === 'workout'), `dni=${days}`);
    }
  }
});

test('generator: uwzględnia sprzęt (dom bez sprzętu → tylko masa ciała/mata)', () => {
  const p = generatePlan(input({ location: 'home', equipment: ['bodyweight', 'mat'], days: 3, goal: 'fullbody' }));
  for (const d of p.days) for (const it of d.items) {
    const e = getEx(it.exId)!;
    assert.ok(e.equipment.every((q) => ['bodyweight', 'mat'].includes(q)), `${it.exId} wymaga ${e.equipment}`);
  }
});

test('generator: poziom początkujący nie dostaje ćwiczeń zaawansowanych, ograniczenia filtrują ryzykowne', () => {
  const p = generatePlan(input({ level: 'beginner', limitations: ['knees', 'shoulders'], location: 'both' }));
  for (const d of p.days) for (const it of d.items) {
    const e = getEx(it.exId)!;
    if (it.section === 'main' || !it.section) { assert.equal(e.level, 'beginner', it.exId); assert.ok(!e.flags?.includes('deep-knee') && !e.flags?.includes('overhead') && !e.flags?.includes('impact'), it.exId); }
  }
});

test('generator: czas treningu mieści się w budżecie (±35%) i jest rozgrzewka + rozciąganie', () => {
  for (const minutes of [30, 45, 60, 90]) {
    const p = generatePlan(input({ minutes }));
    for (const d of p.days.filter((x) => x.kind === 'workout')) {
      assert.ok(dayMinutes(d) <= minutes * 1.35 + 5, `${minutes} min → ${dayMinutes(d)}`);
      assert.ok(d.items.some((i) => i.section === 'warmup') && d.items.some((i) => i.section === 'cooldown'));
    }
  }
});

test('generator: cele mobilność/elastyczność dają głównie sesje mobilności', () => {
  const p = generatePlan(input({ goal: 'mobility', days: 5 }));
  assert.ok(p.days.filter((d) => d.kind === 'mobility').length >= 2);
});

test('szablony: każdy buduje się dla każdej płci/poziomu; ćwiczenia nie są ograniczane płcią', () => {
  for (const t of TEMPLATES) for (const gender of ['female', 'male', 'na'] as const) for (const level of ['beginner', 'advanced'] as const) {
    const p = buildTemplatePlan(t.id, { gender, level, equipment: ['bodyweight', 'mat', 'dumbbells', 'band', 'kettlebell', 'bench', 'pullup_bar', 'barbell', 'rack', 'machine', 'cable', 'step'], limitations: [] });
    assert.equal(p.days.length, 7);
    assert.ok(p.days.some((d) => d.kind !== 'rest'));
    for (const d of p.days) for (const it of d.items) assert.ok(getEx(it.exId));
  }
  const kbBeginner = buildTemplatePlan('t-kettlebell', { gender: 'na', level: 'beginner', equipment: ['kettlebell', 'bodyweight', 'mat'], limitations: [] });
  const all = kbBeginner.days.flatMap((d) => d.items.filter((i) => i.section !== 'warmup' && i.section !== 'cooldown').map((i) => getEx(i.exId)!));
  assert.ok(all.every((e) => e.level !== 'advanced'));
});

test('serie: jawnie zdefiniowane zakresy mieszczą się w zdrowych granicach', () => {
  for (const e of EXERCISES.filter((x) => x.scheme.reps)) for (const goal of ['strength', 'muscle', 'fatloss', 'conditioning', 'habits'] as const) {
    const it = itemFor(e, goal, 'intermediate');
    if (it.reps) assert.ok(it.reps[0] <= it.reps[1] && it.reps[0] >= 1, `${e.id}/${goal}: ${it.reps}`);
    assert.ok(it.sets >= 1 && it.sets <= 6);
  }
});

// ——— STATYSTYKI / PROGRESJA ———
const mk = (date: string, exId: string, sets: { reps: number; weight: number }[], t = Date.parse(date)): SessionRecord => ({
  id: date + exId, date, startedAt: t, endedAt: t + 3_600_000, durationSec: 3600, title: 'x', kind: 'workout',
  items: [{ exId, rest: 60, sets: sets.map((s) => ({ ...s, done: true })) }],
});

test('statystyki: objętość, rekordy, nowy rekord, seria dni, tygodnie', () => {
  const today = new Date(2026, 10, 9); // 9 listopada 2026 (pn)
  const h = [mk('2026-11-06', 'gym-back-squat', [{ reps: 5, weight: 80 }]), mk('2026-11-07', 'gym-back-squat', [{ reps: 5, weight: 82.5 }]), mk('2026-11-08', 'gym-bench-press', [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }])];
  assert.equal(sessionVolume(h[2]), 960);
  assert.equal(personalRecords(h)['gym-back-squat'].weight, 82.5);
  assert.equal(activeStreak(h, today), 3);
  assert.equal(activeStreak(h, new Date(2026, 10, 12)), 0);
  const w = weeklySeries(h, 2, today);
  assert.equal(w[0].sessions, 3); // poprzedni tydzień (2–8.11)
  assert.equal(w[1].sessions, 0);
  const nr = newRecords(h, mk('2026-11-09', 'gym-back-squat', [{ reps: 5, weight: 85 }]));
  assert.equal(nr.length, 1);
  assert.equal(newRecords(h, mk('2026-11-09', 'gym-back-squat', [{ reps: 5, weight: 70 }])).length, 0);
  assert.equal(lastPerformance(h, 'gym-back-squat')?.sets[0].weight, 82.5);
  assert.ok(epley(100, 5) > 100 && epley(100, 1) === 100);
});

test('progresja: brak gwałtownych skoków; najpierw dobijanie powtórzeń', () => {
  const sq = getEx('gym-back-squat')!; // 5–8
  assert.equal(suggestNext(sq, []).weight, null);
  const notTop = suggestNext(sq, [mk('2026-11-01', sq.id, [{ reps: 6, weight: 100 }, { reps: 5, weight: 100 }])]);
  assert.equal(notTop.weight, 100);
  const top = suggestNext(sq, [mk('2026-11-01', sq.id, [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }])]);
  assert.ok(top.weight! > 100 && top.weight! <= 100 * (1 + MAX_JUMP_PCT) + 1e-9, String(top.weight));
  const light = getEx('gym-hammer-curl')!; // hantle, krok 1 kg
  const l = suggestNext(light, [mk('2026-11-01', light.id, [{ reps: 12, weight: 10 }, { reps: 12, weight: 10 }])]);
  assert.ok(l.weight! - 10 <= 1.01);
});

test('klucz daty jest lokalny i stabilny', () => { assert.equal(dateKey(new Date(2026, 10, 9, 23, 59)), '2026-11-09'); });
