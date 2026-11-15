import test from 'node:test';
import assert from 'node:assert/strict';
import { beatLevel, coachState, PREP_MS } from '../src/engine/coach';

test('coach: przygotowanie 3-2-1, potem jednostki i koniec', () => {
  const spec = { kind: 'time' as const, total: 5, unitMs: 1000 };
  assert.deepEqual(coachState(0, spec), { phase: 'prep', prepLeft: 3, units: 0, remaining: 5 });
  assert.equal(coachState(1200, spec).prepLeft, 2);
  assert.equal(coachState(PREP_MS - 1, spec).prepLeft, 1);
  assert.deepEqual(coachState(PREP_MS, spec), { phase: 'run', prepLeft: 0, units: 0, remaining: 5 });
  assert.equal(coachState(PREP_MS + 2500, spec).units, 2);
  assert.equal(coachState(PREP_MS + 5000, spec).phase, 'done');
  assert.equal(coachState(PREP_MS + 99999, spec).units, 5);
});

test('coach: powtórzenia liczone w tempie', () => {
  const spec = { kind: 'reps' as const, total: 10, unitMs: 3000 };
  assert.equal(coachState(PREP_MS + 9000, spec).units, 3);
  assert.equal(coachState(PREP_MS + 30000, spec).phase, 'done');
});

test('coach: ostatnie 3 sekundy / 3 powtórzenia są głośniejsze', () => {
  assert.deepEqual([6, 4].map((r) => beatLevel('time', r)), ['soft', 'soft']);
  assert.deepEqual([3, 2, 1].map((r) => beatLevel('time', r)), ['loud', 'loud', 'loud']);
  assert.equal(beatLevel('time', 0), 'done');
  // powtórzenia: sygnał po ukończeniu powtórzenia; 3 ostatnie = pozostało 2, 1, 0
  assert.deepEqual([5, 3].map((r) => beatLevel('reps', r)), ['soft', 'soft']);
  assert.deepEqual([2, 1].map((r) => beatLevel('reps', r)), ['loud', 'loud']);
  assert.equal(beatLevel('reps', 0), 'done');
});
