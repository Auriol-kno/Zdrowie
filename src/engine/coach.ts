// Prowadzenie „jak trener”: odliczanie przygotowania, tyknięcie na każdą sekundę / powtórzenie,
// głośniejsze sygnały w ostatnich 3 sekundach lub 3 powtórzeniach. Czysta logika (bez UI i audio).

export const PREP_MS = 3000;
export type CoachKind = 'time' | 'reps';
export type BeatLevel = 'soft' | 'loud' | 'done';

export interface CoachSpec { kind: CoachKind; total: number; unitMs: number }
export interface CoachState {
  phase: 'prep' | 'run' | 'done';
  /** sekundy przygotowania do startu (3,2,1) */
  prepLeft: number;
  /** ukończone jednostki: sekundy (czas) albo powtórzenia */
  units: number;
  /** ile jednostek zostało */
  remaining: number;
}

/** Stan prowadzenia po `elapsedMs` od naciśnięcia Start. */
export function coachState(elapsedMs: number, spec: CoachSpec): CoachState {
  const total = Math.max(0, Math.floor(spec.total));
  if (elapsedMs < PREP_MS) return { phase: 'prep', prepLeft: Math.ceil((PREP_MS - Math.max(0, elapsedMs)) / 1000), units: 0, remaining: total };
  const units = Math.min(total, Math.floor((elapsedMs - PREP_MS) / Math.max(1, spec.unitMs)));
  return { phase: units >= total ? 'done' : 'run', prepLeft: 0, units, remaining: total - units };
}

/** Rodzaj sygnału po ukończeniu kolejnej jednostki. Czas: głośno przy 3, 2, 1 s do końca.
 *  Powtórzenia: głośno przy 3 ostatnich powtórzeniach. 0 pozostałych = sygnał końca. */
export function beatLevel(kind: CoachKind, remaining: number): BeatLevel {
  if (remaining <= 0) return 'done';
  if (kind === 'time') return remaining <= 3 ? 'loud' : 'soft';
  return remaining <= 2 ? 'loud' : 'soft';
}
