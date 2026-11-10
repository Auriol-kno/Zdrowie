import type { EquipmentId, Exercise, Level, Module, MuscleId } from '../core/types';
import { GYM } from './ex-gym';
import { HOME } from './ex-home';
import { KB } from './ex-kb';
import { MOBILITY } from './ex-mobility';
import { POSTURE } from './ex-posture';
import { MUSCLES } from './muscles';

export const EXERCISES: Exercise[] = [...GYM, ...HOME, ...KB, ...MOBILITY, ...POSTURE];
export const EX_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export const getEx = (id: string): Exercise | undefined => EX_BY_ID[id];

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Szacowany czas ćwiczenia (sekundy): serie × (praca + odpoczynek). */
export function estimateSec(e: Exercise, sets = e.scheme.sets): number {
  const sc = e.scheme;
  const side = sc.perSide ? 2 : 1;
  const work = sc.seconds ?? (sc.reps ? Math.round(((sc.reps[0] + sc.reps[1]) / 2) * 3.5) : 40);
  return Math.round(sets * (work * side + sc.rest));
}

export interface ExFilter {
  q?: string;
  module?: Module | 'all';
  muscle?: MuscleId | null;
  equipment?: EquipmentId[]; // dostępny sprzęt: ćwiczenie musi być wykonalne
  level?: Level | 'all';
  maxMinutes?: number | null;
  place?: 'gym' | 'home' | 'all';
}

export function equipmentOk(e: Exercise, available: EquipmentId[] | undefined): boolean {
  if (!available || available.length === 0) return true;
  const have = new Set<EquipmentId>([...available, 'bodyweight']);
  return e.equipment.every((q) => have.has(q));
}

export function filterExercises(f: ExFilter, list: Exercise[] = EXERCISES): Exercise[] {
  const q = f.q ? norm(f.q.trim()) : '';
  return list.filter((e) => {
    if (f.module && f.module !== 'all' && e.module !== f.module) return false;
    if (f.level && f.level !== 'all' && e.level !== f.level) return false;
    if (f.place && f.place !== 'all' && !e.location.includes(f.place)) return false;
    if (f.muscle && !e.primary.includes(f.muscle) && !e.secondary.includes(f.muscle)) return false;
    if (f.equipment && !equipmentOk(e, f.equipment)) return false;
    if (f.maxMinutes && estimateSec(e) > f.maxMinutes * 60) return false;
    if (q) {
      const hay = norm([e.pl, e.en, ...e.tags, ...e.primary.map((m) => MUSCLES[m].pl), ...e.secondary.map((m) => MUSCLES[m].pl)].join(' '));
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** Ćwiczenia dla mięśnia — główne najpierw. */
export function exercisesForMuscle(m: MuscleId, equipment?: EquipmentId[]): Exercise[] {
  const list = filterExercises({ muscle: m, equipment });
  return list.sort((a, b) => Number(b.primary.includes(m)) - Number(a.primary.includes(m)));
}
