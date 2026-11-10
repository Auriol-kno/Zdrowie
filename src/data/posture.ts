import type { PlanItem, PostureExCfg, PostureFocus } from '../core/types';
import { getEx } from './exercises';

export interface PostureEntry { id: string; focus: PostureFocus[]; rec: boolean; hold?: number; avoid?: PostureFocus[]; note?: string }

// Kuracja ćwiczeń z całej bazy (nowe + istniejące) pod kątem lordozy/skoliozy. rec = w zestawie rekomendowanym.
export const POSTURE_CATALOG: PostureEntry[] = [
  { id: 'p-pelvic-tilt', focus: ['lordosis'], rec: true, hold: 3 },
  { id: 'p-tra-activation', focus: ['lordosis', 'scoliosis'], rec: true },
  { id: 'p-wall-stance', focus: ['lordosis', 'scoliosis'], rec: true },
  { id: 'm-hip-flexor', focus: ['lordosis'], rec: true, note: 'Rozciąganie przodu biodra — zwykle skrócone przy lordozie.' },
  { id: 'home-glute-bridge', focus: ['lordosis'], rec: true, hold: 2 },
  { id: 'home-dead-bug', focus: ['lordosis', 'scoliosis'], rec: true, note: 'Lędźwie utrzymuj przy podłodze.' },
  { id: 'p-knees-to-chest', focus: ['lordosis'], rec: false },
  { id: 'm-childs-pose', focus: ['lordosis'], rec: false },
  { id: 'm-hamstring-supine', focus: ['lordosis'], rec: false },
  { id: 'm-quad-standing', focus: ['lordosis'], rec: false },
  { id: 'p-side-leg-raise', focus: ['lordosis', 'scoliosis'], rec: false },
  { id: 'p-single-leg-stance', focus: ['lordosis', 'scoliosis'], rec: false },
  { id: 'p-scap-squeeze', focus: ['scoliosis', 'lordosis'], rec: true, hold: 3 },
  { id: 'home-bird-dog', focus: ['scoliosis', 'lordosis'], rec: true, hold: 3 },
  { id: 'p-lateral-breath', focus: ['scoliosis'], rec: true },
  { id: 'p-seated-side-bend', focus: ['scoliosis'], rec: false, note: 'Strona i dawka wg zaleceń fizjoterapeuty.' },
  { id: 'm-thoracic-openbook', focus: ['scoliosis'], rec: false, note: 'Kierunek rotacji wg zaleceń fizjoterapeuty.' },
  { id: 'home-side-plank', focus: ['scoliosis'], rec: false, note: 'Często zaleca się inną dawkę na każdą stronę — skonsultuj.' },
  { id: 'm-wall-slides', focus: ['scoliosis', 'lordosis'], rec: false },
  { id: 'm-cat-cow', focus: ['scoliosis', 'lordosis'], rec: false },
  { id: 'p-prone-w', focus: ['scoliosis'], rec: false, hold: 2, avoid: ['lordosis'] },
];

export const ENTRY_BY_ID: Record<string, PostureEntry> = Object.fromEntries(POSTURE_CATALOG.map((e) => [e.id, e]));

export function catalogFor(focus: PostureFocus | 'all'): PostureEntry[] {
  return POSTURE_CATALOG.filter((e) => focus === 'all' || e.focus.includes(focus));
}

export const isAvoided = (id: string, focus: PostureFocus | 'all') => focus !== 'all' && !!ENTRY_BY_ID[id]?.avoid?.includes(focus);

export function defaultCfg(id: string): PostureExCfg {
  const ex = getEx(id);
  const e = ENTRY_BY_ID[id];
  const sc = ex?.scheme;
  const timed = !!sc?.seconds && !sc?.reps;
  return {
    on: false, sets: sc?.sets ?? 2, mode: timed ? 'time' : 'reps',
    reps: sc?.reps ? Math.round((sc.reps[0] + sc.reps[1]) / 2) : 10,
    hold: e?.hold ?? 0, seconds: sc?.seconds ?? 30, rest: sc?.rest ?? 30,
  };
}

export const clampCfg = (c: PostureExCfg): PostureExCfg => ({
  ...c, sets: Math.min(6, Math.max(1, Math.round(c.sets))), reps: Math.min(30, Math.max(1, Math.round(c.reps))),
  hold: Math.min(30, Math.max(0, Math.round(c.hold))), seconds: Math.min(300, Math.max(5, Math.round(c.seconds))), rest: Math.min(180, Math.max(0, Math.round(c.rest))),
});

export function resolveCfg(conf: { cfg?: Record<string, PostureExCfg> } | undefined, id: string): PostureExCfg {
  return clampCfg({ ...defaultCfg(id), ...(conf?.cfg?.[id] ?? {}) });
}

export function recommendedIds(focus: PostureFocus | 'all'): string[] {
  return catalogFor(focus).filter((e) => e.rec && !isAvoided(e.id, focus)).map((e) => e.id);
}

/** Konfiguracja → element planu/treningu. */
export function cfgToItem(id: string, c: PostureExCfg): PlanItem {
  const ex = getEx(id);
  const k = clampCfg(c);
  return {
    exId: id, sets: k.sets, rest: k.rest, section: 'main', perSide: ex?.scheme.perSide,
    ...(k.mode === 'time' ? { seconds: k.seconds } : { reps: [k.reps, k.reps] as [number, number], hold: k.hold || undefined }),
  };
}

/** Szacowany czas zestawu (s) — z uwzględnieniem utrzymania i stron. */
export function estimateItemSec(it: PlanItem): number {
  const side = it.perSide ? 2 : 1;
  const work = it.seconds ?? (it.reps ? it.reps[0] * (2 + (it.hold ?? 0)) : 30);
  return Math.round(it.sets * (work * side + it.rest));
}
