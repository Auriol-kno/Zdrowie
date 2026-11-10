import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_SLOTS, getSlot } from '../src/core/db';
import { addSession, getState, init, listProfiles, saveProfile, saveSettings, switchProfile } from '../src/core/store';
import { SECTIONS, SECTION_IDS, knownIds, stretchArea } from '../src/data/builder';
import { EX_BY_ID } from '../src/data/exercises';

const prof = (name: string) => ({ name, gender: 'na', age: null, heightCm: null, weightKg: null, level: 'beginner', goal: 'habits', location: 'home', equipment: [], daysPerWeek: 3, minutes: 30, intensity: 'low', limitations: [] }) as never;

test('3 profile mają rozłączne dane (profil, ustawienia, historia) i przełączają się bez utraty', async () => {
  assert.equal(PROFILE_SLOTS, 3);
  await init({ restoreSlot: false });
  assert.equal(getSlot(), 0);
  await saveProfile(prof('Ala')); await saveSettings({ onboarded: true, builders: { spine: { filter: 'lordosis', cfg: {} } } });
  await addSession({ id: 's1', date: '2026-11-10', startedAt: 1, endedAt: 2, durationSec: 60, title: 'A', kind: 'workout', items: [] });

  await switchProfile(1);
  assert.equal(getSlot(), 1);
  assert.equal(getState().profile, null); assert.equal(getState().sessions.length, 0); assert.equal(getState().settings.onboarded, false);
  assert.equal(getState().settings.builders, undefined);
  await saveProfile(prof('Bartek')); await saveSettings({ onboarded: true, builders: { stretch: { filter: 'hips', cfg: {} } } });

  await switchProfile(2);
  assert.equal(getState().profile, null);

  await switchProfile(0);
  assert.equal(getState().profile?.name, 'Ala'); assert.equal(getState().sessions.length, 1);
  assert.equal(getState().settings.builders?.spine?.filter, 'lordosis'); assert.equal(getState().settings.builders?.stretch, undefined);

  const list = await listProfiles();
  assert.deepEqual(list.map((x) => x.name), ['Ala', 'Bartek', null]);
  assert.deepEqual(list.map((x) => x.onboarded), [true, true, false]);
  assert.deepEqual(list.map((x) => x.sessions), [1, 0, 0]);
  await assert.rejects(() => switchProfile(5));
});

test('sekcje Kręgosłup i Rozciąganie: katalogi, filtry i zestawy rekomendowane są spójne', () => {
  for (const id of SECTION_IDS) {
    const def = SECTIONS[id];
    for (const f of def.filters) {
      const cat = def.catalog(f.v);
      assert.ok(cat.length >= 1, `${id}/${f.v}: pusty katalog`);
      assert.equal(new Set(cat.map((c) => c.id)).size, cat.length, `${id}/${f.v}: duplikaty`);
      for (const c of cat) assert.ok(EX_BY_ID[c.id], c.id);
      const rec = def.recommended(f.v);
      assert.ok(rec.length >= 1, `${id}/${f.v}: brak rekomendacji`);
      for (const r of rec) assert.ok(cat.some((c) => c.id === r && !c.avoid), `${id}/${f.v}: ${r} poza katalogiem lub niewskazane`);
    }
    assert.ok(def.info('all').length > 10 && def.disclaimer.length > 20);
  }
  // „Wszystkie” w rozciąganiu = suma obszarów
  const all = SECTIONS.stretch.catalog('all').length;
  const parts = SECTIONS.stretch.filters.filter((f) => f.v !== 'all').reduce((n, f) => n + SECTIONS.stretch.catalog(f.v).length, 0);
  assert.equal(all, parts);
  assert.ok(knownIds('stretch').every((i) => stretchArea(EX_BY_ID[i])));
});
