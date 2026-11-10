import { useSyncExternalStore } from 'react';
import type { BackupFile, SectionId, Measurement, Plan, Profile, SessionRecord, Settings, WorkoutDraft } from './types';
import { PROFILE_SLOTS, deleteAllData, getSlot, getStorage, selectSlot, storageForSlot } from './db';
import { uid } from './time';

export type Screen =
  | { name: 'exercise'; id: string }
  | { name: 'atlas' }
  | { name: 'settings' }
  | { name: 'profile' }
  | { name: 'timers' }
  | { name: 'routine'; id: string }
  | { name: 'programs' }
  | { name: 'planEditor'; planId: string }
  | { name: 'builder'; section: SectionId }
  | { name: 'finish' }
  | { name: 'history'; sessionId?: string };

export type Tab = 'home' | 'plan' | 'library' | 'workout' | 'progress';

export interface State {
  ready: boolean;
  profile: Profile | null;
  settings: Settings;
  plans: Plan[];
  sessions: SessionRecord[];
  measurements: Measurement[];
  draft: WorkoutDraft | null;
  tab: Tab;
  stack: Screen[];
  toast: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'marble', lang: 'pl', sound: true, vibrate: true, voice: false, autoRest: true, defaultRest: 60, activePlanId: null, onboarded: false,
};

let state: State = {
  ready: false, profile: null, settings: DEFAULT_SETTINGS, plans: [], sessions: [], measurements: [], draft: null, tab: 'home', stack: [], toast: null,
};
const listeners = new Set<() => void>();
export const getState = () => state;
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
}
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => sel(state),
    () => sel(state),
  );
}

const persist = async (fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { console.error('[FORM+] zapis nie powiódł się', e); setState({ toast: 'Nie udało się zapisać danych na urządzeniu.' }); }
};

// ——— ładowanie ———
const SLOT_KEY = 'formplus.slot';
const readSavedSlot = (): number => { try { const n = Number(localStorage.getItem(SLOT_KEY)); return Number.isInteger(n) && n >= 0 && n < PROFILE_SLOTS ? n : 0; } catch { return 0; } };
const writeSavedSlot = (n: number) => { try { localStorage.setItem(SLOT_KEY, String(n)); } catch { /* tryb prywatny — profil nie zostanie zapamiętany */ } };

export async function init(opts: { restoreSlot?: boolean } = { restoreSlot: true }) {
  if (opts.restoreSlot !== false) selectSlot(readSavedSlot());
  const st = getStorage();
  try {
    const [profile, settings, plans, sessions, measurements, draft] = await Promise.all([
      st.get<Profile>('kv', 'profile'), st.get<Settings>('kv', 'settings'), st.getAll<Plan>('plans'),
      st.getAll<SessionRecord>('sessions'), st.getAll<Measurement>('measurements'), st.get<WorkoutDraft>('kv', 'draft'),
    ]);
    setState({
      ready: true, profile: profile ?? null, settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
      plans: plans.sort((a, b) => a.createdAt - b.createdAt), sessions: sessions.sort((a, b) => a.startedAt - b.startedAt),
      measurements: measurements.sort((a, b) => a.date.localeCompare(b.date)), draft: draft ?? null,
    });
  } catch (e) {
    console.error(e);
    setState({ ready: true, toast: 'Magazyn danych jest niedostępny (tryb prywatny?). Dane nie będą zapisywane.' });
  }
}

// ——— profile (3 miejsca, każdy z własnymi danymi) ———
export interface ProfileSlotInfo { slot: number; name: string | null; onboarded: boolean; sessions: number }
export async function listProfiles(): Promise<ProfileSlotInfo[]> {
  const out: ProfileSlotInfo[] = [];
  for (let i = 0; i < PROFILE_SLOTS; i++) {
    try {
      const st = storageForSlot(i);
      const [p, set, ses] = await Promise.all([st.get<Profile>('kv', 'profile'), st.get<Settings>('kv', 'settings'), st.getAll<SessionRecord>('sessions')]);
      out.push({ slot: i, name: p?.name?.trim() || null, onboarded: !!set?.onboarded, sessions: ses.length });
    } catch { out.push({ slot: i, name: null, onboarded: false, sessions: 0 }); }
  }
  return out;
}
export const currentSlot = () => getSlot();
export async function switchProfile(n: number) {
  if (n === getSlot()) return;
  const prev = state.settings;
  selectSlot(n); writeSavedSlot(n);
  setState({ ready: false, profile: null, settings: DEFAULT_SETTINGS, plans: [], sessions: [], measurements: [], draft: null, tab: 'home', stack: [], toast: null });
  await init({ restoreSlot: false });
  if (!state.settings.onboarded && !state.profile) {
    // nowy, pusty profil: zacznij od wyglądu i języka poprzedniego
    await saveSettings({ theme: prev.theme, lang: prev.lang, sound: prev.sound, vibrate: prev.vibrate, voice: prev.voice });
  }
}

// ——— nawigacja ———
export const nav = {
  tab: (tab: Tab) => setState({ tab, stack: [] }),
  push: (s: Screen) => setState((st) => ({ stack: [...st.stack, s] })),
  pop: () => setState((st) => ({ stack: st.stack.slice(0, -1) })),
  reset: () => setState({ stack: [] }),
  toast: (m: string | null) => setState({ toast: m }),
};

// ——— profil / ustawienia ———
export const saveProfile = (p: Profile) => { setState({ profile: p }); return persist(() => getStorage().put('kv', p, 'profile')); };
export const saveSettings = (patch: Partial<Settings>) => {
  const s = { ...state.settings, ...patch };
  setState({ settings: s });
  return persist(() => getStorage().put('kv', s, 'settings'));
};

// ——— plany ———
export const savePlan = (p: Plan) => {
  setState((s) => ({ plans: s.plans.some((x) => x.id === p.id) ? s.plans.map((x) => (x.id === p.id ? p : x)) : [...s.plans, p] }));
  return persist(() => getStorage().put('plans', p));
};
export const deletePlan = async (id: string) => {
  setState((s) => ({ plans: s.plans.filter((p) => p.id !== id) }));
  await persist(() => getStorage().del('plans', id));
  if (state.settings.activePlanId === id) await saveSettings({ activePlanId: state.plans[0]?.id ?? null });
};
export const duplicatePlan = async (id: string) => {
  const p = state.plans.find((x) => x.id === id);
  if (!p) return null;
  const copy: Plan = { ...structuredClone(p), id: uid('plan'), name: `${p.name} (kopia)`, createdAt: Date.now() };
  await savePlan(copy);
  return copy;
};
export const activePlan = (s: State = state): Plan | null => s.plans.find((p) => p.id === s.settings.activePlanId) ?? null;

// ——— sesje ———
export const addSession = (r: SessionRecord) => {
  setState((s) => ({ sessions: [...s.sessions.filter((x) => x.id !== r.id), r].sort((a, b) => a.startedAt - b.startedAt) }));
  return persist(() => getStorage().put('sessions', r));
};
export const deleteSession = (id: string) => {
  setState((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
  return persist(() => getStorage().del('sessions', id));
};

// ——— szkic aktywnego treningu (zapisywany po każdej zmianie) ———
export const setDraft = (d: WorkoutDraft | null) => {
  setState({ draft: d });
  return persist(async () => { if (d) await getStorage().put('kv', d, 'draft'); else await getStorage().del('kv', 'draft'); });
};

// ——— pomiary ———
export const addMeasurement = (m: Omit<Measurement, 'id'>) => {
  const full: Measurement = { ...m, id: uid('m') };
  setState((s) => ({ measurements: [...s.measurements, full].sort((a, b) => a.date.localeCompare(b.date)) }));
  return persist(() => getStorage().put('measurements', full));
};
export const deleteMeasurement = (id: string) => {
  setState((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) }));
  return persist(() => getStorage().del('measurements', id));
};

// ——— kopia zapasowa ———
export function buildBackup(s: State = state): BackupFile {
  return { app: 'formplus', version: 1, exportedAt: Date.now(), profile: s.profile, settings: s.settings, plans: s.plans, sessions: s.sessions, measurements: s.measurements };
}

export function validateBackup(x: unknown): x is BackupFile {
  const b = x as BackupFile;
  return !!b && b.app === 'formplus' && b.version === 1 && Array.isArray(b.plans) && Array.isArray(b.sessions) && Array.isArray(b.measurements) && !!b.settings;
}

export async function importBackup(b: BackupFile) {
  if (!validateBackup(b)) throw new Error('To nie jest poprawny plik kopii zapasowej FORM+.');
  const st = getStorage();
  await deleteAllData();
  if (b.profile) await st.put('kv', b.profile, 'profile');
  await st.put('kv', { ...DEFAULT_SETTINGS, ...b.settings }, 'settings');
  for (const p of b.plans) await st.put('plans', p);
  for (const s of b.sessions) await st.put('sessions', s);
  for (const m of b.measurements) await st.put('measurements', m);
  await init();
}

export async function eraseEverything() {
  await deleteAllData();
  setState({ profile: null, settings: DEFAULT_SETTINGS, plans: [], sessions: [], measurements: [], draft: null, tab: 'home', stack: [] });
}

export async function resetPlans() {
  for (const p of state.plans) await getStorage().del('plans', p.id);
  setState({ plans: [] });
  await saveSettings({ activePlanId: null });
}

export function sessionsToCsv(sessions: SessionRecord[], exName: (id: string) => string): string {
  const rows = [['data', 'trening', 'ćwiczenie', 'seria', 'powtórzenia', 'ciężar_kg', 'czas_s', 'RPE', 'samopoczucie', 'notatki']];
  for (const s of sessions) for (const it of s.items) it.sets.forEach((st, i) => {
    if (st.done) rows.push([s.date, s.title, exName(it.exId), String(i + 1), String(st.reps ?? ''), String(st.weight ?? ''), String(st.seconds ?? ''), String(s.rpe ?? ''), String(s.mood ?? ''), (s.notes ?? '').replace(/\s+/g, ' ')]);
  });
  return rows.map((r) => r.map((c) => (/[",;\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}
