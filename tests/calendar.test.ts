import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, icsEscape, icsFold, nextOccurrence, trainingDays } from '../src/engine/ics';
import { dropIndex, moveItem } from '../src/engine/reorder';
import { EXERCISES } from '../src/data/exercises';
import { planItemFromEx } from '../src/ui/actions';
import type { Plan } from '../src/core/types';

const items = EXERCISES.slice(0, 3).map(planItemFromEx);
const plan = { id: 'p1', name: 'Mój, plan; test', createdAt: 0, days: [
  { kind: 'workout', title: 'Siła A', items }, { kind: 'rest', title: 'Odpoczynek', items: [] }, { kind: 'mobility', title: 'Mobilność', items: items.slice(0, 1) },
  { kind: 'workout', title: 'Pusty', items: [] }, { kind: 'rest', title: 'Odpoczynek', items: [] }, { kind: 'rest', title: 'Odpoczynek', items: [] }, { kind: 'rest', title: 'Odpoczynek', items: [] },
] } as unknown as Plan;
// środa 2026-11-11 17:00 lokalnie
const NOW = new Date(2026, 10, 11, 17, 0, 0);

test('ICS: dni treningowe, powtarzanie tygodniowe, alarm, CRLF', () => {
  assert.deepEqual(trainingDays(plan), [0, 2]);
  const ics = buildIcs(plan, { time: '18:30', weeks: 8, reminderMin: 30, now: NOW });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.equal((ics.match(/RRULE:FREQ=WEEKLY;COUNT=8/g) ?? []).length, 2);
  assert.equal((ics.match(/TRIGGER:-PT30M/g) ?? []).length, 2);
  assert.ok(!/[^\r]\n/.test(ics), 'każda linia kończy się CRLF');
  assert.ok(ics.includes('UID:p1-d0@formplus') && ics.includes('UID:p1-d2@formplus'));
  assert.ok(ics.includes('SUMMARY:FORM+: Siła A'));
  assert.ok(ics.includes('X-WR-CALNAME:FORM+ — Mój\\, plan\; test'.replace('—', '—')) || ics.includes('Mój\\, plan\; test'));
  // poniedziałek po środzie → 2026-11-16, piątek wolny; dzień 2 (środa) o 18:30 jest jeszcze dziś
  assert.ok(ics.includes('DTSTART:20261116T183000'));
  assert.ok(ics.includes('DTSTART:20261111T183000'));
  assert.equal(buildIcs(plan, { time: '18:30', weeks: 1, reminderMin: null, now: NOW }).includes('VALARM'), false);
  assert.equal(buildIcs(plan, { time: '18:30', weeks: 4, reminderMin: null, days: [2], now: NOW }).match(/BEGIN:VEVENT/g)!.length, 1);
});

test('ICS: najbliższy termin — dziś tylko gdy godzina jeszcze nie minęła; escapowanie i składanie linii', () => {
  assert.equal(nextOccurrence(2, '16:00', NOW).getDate(), 18);
  assert.equal(nextOccurrence(2, '18:00', NOW).getDate(), 11);
  assert.equal(nextOccurrence(0, '09:00', NOW).getDate(), 16);
  assert.equal(icsEscape('a,b;c\\d\ne'), 'a\\,b\;c\\\\d\\ne');
  const long = 'DESCRIPTION:' + 'ąęść'.repeat(40);
  const folded = icsFold(long).split('\r\n');
  assert.ok(folded.length > 1);
  for (const l of folded) assert.ok(new TextEncoder().encode(l).length <= 75);
  assert.equal(folded.map((l, i) => (i ? l.slice(1) : l)).join(''), long);
});

test('przeciąganie: moveItem i dropIndex', () => {
  assert.deepEqual(moveItem([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem([1, 2, 3, 4], 3, 0), [4, 1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 1, 9), [1, 3, 2]);
  assert.deepEqual(moveItem([1, 2, 3], 5, 0), [1, 2, 3]);
  assert.equal(dropIndex([10, 30, 50], 5), 0);
  assert.equal(dropIndex([10, 30, 50], 31), 2);
  assert.equal(dropIndex([10, 30, 50], 999), 3);
  // z uwzględnieniem przeciąganego wiersza: przekroczenie środka sąsiada = zamiana miejsc
  assert.equal(dropIndex([10, 30, 50], 10, 0), 0);
  assert.equal(dropIndex([10, 30, 50], 31, 0), 1);
  assert.equal(dropIndex([10, 30, 50], 51, 0), 2);
  assert.equal(dropIndex([10, 30, 50], 29, 2), 1);
  assert.equal(dropIndex([10, 30, 50], 9, 2), 0);
});
