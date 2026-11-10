import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, EX_BY_ID, filterExercises, norm } from '../src/data/exercises';
import { MUSCLES, MUSCLE_IDS } from '../src/data/muscles';
import { ANIMS } from '../src/data/poses';
import { ROUTINES } from '../src/data/routines';
import { TEMPLATES } from '../src/data/templates';
import { resolveSpec, solve, L, sampleAt, cycleMs } from '../src/engine/figure';

test('baza ma ≥60 rekordów i unikalne ID', () => {
  assert.ok(EXERCISES.length >= 60, `jest ${EXERCISES.length}`);
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
});

test('brak duplikatów nazw PL/EN', () => {
  assert.equal(new Set(EXERCISES.map((e) => e.pl.toLowerCase())).size, EXERCISES.length);
  assert.equal(new Set(EXERCISES.map((e) => e.en.toLowerCase())).size, EXERCISES.length);
});

test('każde ćwiczenie ma komplet pól i poprawne odniesienia', () => {
  for (const e of EXERCISES) {
    assert.ok(e.pl && e.en, e.id);
    assert.ok(e.primary.length > 0, `${e.id}: brak mięśni głównych`);
    for (const m of [...e.primary, ...e.secondary]) assert.ok(MUSCLES[m], `${e.id}: nieznany mięsień ${m}`);
    assert.ok(e.steps.length >= 3, `${e.id}: za mało kroków`);
    assert.ok(e.cues.length >= 1 && e.mistakes.length >= 1 && e.safety.length >= 1, e.id);
    assert.ok(e.breathing.length > 5, `${e.id}: brak oddechu`);
    assert.ok(e.scheme.sets >= 1 && (e.scheme.reps || e.scheme.seconds), `${e.id}: schemat`);
    assert.ok(e.equipment.length >= 1, `${e.id}: sprzęt`);
    for (const a of e.alt) assert.ok(EX_BY_ID[a], `${e.id}: alternatywa ${a} nie istnieje`);
    assert.ok(!e.alt.includes(e.id), `${e.id}: alternatywa wskazuje na siebie`);
    assert.ok(e.primary.every((m) => !e.secondary.includes(m)), `${e.id}: mięsień jednocześnie główny i pomocniczy`);
  }
});

test('wymagane ćwiczenia kettlebell istnieją (15)', () => {
  const need = ['kb-deadlift', 'kb-swing', 'kb-goblet-squat', 'kb-clean', 'kb-press', 'kb-push-press', 'kb-turkish-getup', 'kb-snatch', 'kb-row', 'kb-farmer-carry', 'kb-suitcase-carry', 'kb-halo', 'kb-lunge', 'kb-floor-press', 'kb-windmill'];
  for (const id of need) assert.ok(EX_BY_ID[id], id);
});

test('ćwiczenia złożone/zaawansowane mają informację o doświadczeniu (contra)', () => {
  for (const id of ['kb-turkish-getup', 'kb-snatch', 'kb-windmill', 'kb-swing', 'kb-clean', 'gym-deadlift', 'gym-back-squat', 'm-pnf-hamstring']) assert.ok(EX_BY_ID[id].contra, id);
});

test('stretching dynamiczny/statyczny/aktywny/PNF rozróżniony; brak statycznego jako rozgrzewki', () => {
  const types = new Set(EXERCISES.filter((e) => e.module === 'mobility').map((e) => e.stretchType));
  for (const t of ['dynamic', 'static', 'active', 'pnf', 'mobilization', 'activation', 'breathing']) assert.ok(types.has(t as never), t);
  for (const e of EXERCISES.filter((x) => x.cat === 'warmup')) assert.notEqual(e.stretchType, 'static', e.id);
  for (const r of ROUTINES.filter((x) => x.group === 'warmup'))
    for (const s of r.steps) assert.notEqual(EX_BY_ID[s.exId].stretchType, 'static', `${r.id}/${s.exId}`);
});

test('animacje: każde viz istnieje w bibliotece póz i odwrotnie', () => {
  const viz = new Set(EXERCISES.map((e) => e.animationId).filter(Boolean) as string[]);
  for (const v of viz) assert.ok(ANIMS[v], `brak animacji ${v}`);
  for (const id of Object.keys(ANIMS)) assert.ok(viz.has(id), `animacja ${id} bez ćwiczenia`);
  for (const e of EXERCISES) assert.equal(e.illustrationId, e.animationId);
});

test('IK zachowuje długości segmentów (±0.5 px) we wszystkich klatkach', () => {
  const d = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const a of Object.values(ANIMS)) {
    const rs = a.frames.map((f) => resolveSpec(f.pose));
    const ts = a.frames.length > 1 ? Array.from({ length: 21 }, (_, i) => (i / 20) * cycleMs(a)) : [0];
    for (const t of ts) {
      const j = solve(sampleAt(a, t, rs).pose, a.elbow, a.knee);
      for (const [x, y, len, n] of [
        [j.hip, j.knee, L.TH, 'udo'], [j.knee, j.ankle, L.SH, 'goleń'], [j.shoulder, j.elbow, L.UA, 'ramię'], [j.elbow, j.wrist, L.FA, 'przedramię'],
      ] as [number[], number[], number, string][]) assert.ok(Math.abs(d(x, y) - len) < 0.6, `${a.id}: ${n} ${d(x, y).toFixed(2)} ≠ ${len}`);
    }
  }
});

test('stopy nie wchodzą pod podłoże (animacje stojące)', () => {
  for (const a of Object.values(ANIMS)) {
    for (const f of a.frames) { const j = solve(resolveSpec(f.pose), a.elbow, a.knee); assert.ok(j.ankle[1] < 178, `${a.id}/${f.label}`); }
  }
});

test('rutyny i szablony odwołują się do istniejących ćwiczeń', () => {
  for (const r of ROUTINES) for (const s of r.steps) assert.ok(EX_BY_ID[s.exId], `${r.id}: ${s.exId}`);
  for (const t of TEMPLATES) {
    assert.equal(t.week.length, 7);
    for (const c of t.week) if (c && 'ids' in c) for (const id of c.ids) assert.ok(EX_BY_ID[id], `${t.id}: ${id}`);
  }
});

test('atlas: każda partia ma ćwiczenia, a mięśnie z widoku są w modelu', () => {
  for (const m of MUSCLE_IDS) assert.ok(filterExercises({ muscle: m }).length >= 1, `brak ćwiczeń dla ${m}`);
});

test('wyszukiwanie ignoruje polskie znaki i działa po mięśniach, sprzęcie, poziomie, czasie, miejscu', () => {
  assert.equal(norm('Łopatki ŻÓŁW'), 'lopatki zolw');
  assert.ok(filterExercises({ q: 'przysiad' }).length >= 3);
  assert.ok(filterExercises({ q: 'lydki' }).some((e) => e.id === 'gym-calf-raise'));
  assert.ok(filterExercises({ muscle: 'glutes' }).some((e) => e.id === 'gym-hip-thrust'));
  assert.ok(filterExercises({ equipment: ['kettlebell'] }).every((e) => e.equipment.every((q) => ['kettlebell', 'bodyweight'].includes(q))));
  assert.ok(filterExercises({ level: 'beginner' }).every((e) => e.level === 'beginner'));
  assert.ok(filterExercises({ maxMinutes: 3 }).length > 0);
  assert.ok(filterExercises({ place: 'home' }).every((e) => e.location.includes('home')));
});

test('postawa: katalog odwołuje się do istniejących ćwiczeń, unikalny, z poprawnymi flagami', async () => {
  const { POSTURE_CATALOG, recommendedIds, cfgToItem, defaultCfg, clampCfg, isAvoided, estimateItemSec } = await import('../src/data/posture');
  const ids = POSTURE_CATALOG.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(EX_BY_ID[id], id);
  for (const e of EXERCISES.filter((x) => x.module === 'posture')) {
    assert.ok(e.focus && e.focus.length, e.id);
    assert.ok(ids.includes(e.id), `${e.id} nie jest w katalogu`);
    assert.ok(e.safety.some((s) => /lekarz|fizjoterapeut/i.test(s)), `${e.id}: brak odesłania do specjalisty`);
  }
  for (const f of ['lordosis', 'scoliosis'] as const) {
    const rec = recommendedIds(f);
    assert.ok(rec.length >= 5, f);
    for (const id of rec) assert.ok(!isAvoided(id, f), `${f}: ${id} niewskazane`);
  }
  assert.ok(isAvoided('p-prone-w', 'lordosis'));
  assert.ok(!recommendedIds('lordosis').includes('p-prone-w'));
  // konfiguracja: granice i tryby
  const c = clampCfg({ ...defaultCfg('p-pelvic-tilt'), sets: 99, reps: 0, hold: 99, seconds: 1, rest: -5, mode: 'reps', on: true });
  assert.deepEqual([c.sets, c.reps, c.hold, c.seconds, c.rest], [6, 1, 30, 5, 0]);
  const it = cfgToItem('p-pelvic-tilt', { ...defaultCfg('p-pelvic-tilt'), mode: 'reps', reps: 8, hold: 3, sets: 2, rest: 20 });
  assert.equal(it.reps?.[0], 8); assert.equal(it.hold, 3); assert.equal(it.seconds, undefined);
  const tm = cfgToItem('p-wall-stance', { ...defaultCfg('p-wall-stance'), mode: 'time', seconds: 45 });
  assert.equal(tm.seconds, 45); assert.equal(tm.reps, undefined);
  assert.ok(estimateItemSec(it) > 0);
});
