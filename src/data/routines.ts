import type { MuscleId } from '../core/types';
import { getEx } from './exercises';

export interface RoutineStep { exId: string; sec?: number } // sec = czas pozycji (domyślnie ze schematu ćwiczenia)
export interface Routine {
  id: string;
  pl: string;
  en: string;
  group: 'themed' | 'area' | 'warmup';
  desc: string;
  steps: RoutineStep[];
}

const R = (id: string, pl: string, en: string, group: Routine['group'], desc: string, steps: [string, number?][]): Routine =>
  ({ id, pl, en, group, desc, steps: steps.map(([exId, sec]) => ({ exId, sec })) });

export const ROUTINES: Routine[] = [
  // — programy tematyczne —
  R('r-morning', 'Poranna mobilność', 'Morning mobility', 'themed', 'Delikatne wybudzenie stawów i kręgosłupa (ok. 8 min).',
    [['m-diaphragmatic', 30], ['m-cat-cow', 40], ['m-thread-needle', 30], ['m-worlds-greatest', 40], ['m-leg-swings-fb', 30], ['m-arm-circles', 30]]),
  R('r-after-work', 'Stretching po pracy', 'Post-work stretch', 'themed', 'Klatka, biodra i plecy po siedzącym dniu (ok. 10 min).',
    [['m-chest-doorway', 30], ['m-neck-side', 20], ['m-hip-flexor', 30], ['m-figure4', 30], ['m-childs-pose', 40], ['m-seated-twist', 25]]),
  R('r-after-gym', 'Regeneracja po siłowni', 'Post-gym recovery', 'themed', 'Statyczne rozciąganie głównych partii + wyciszenie (ok. 12 min).',
    [['m-quad-standing', 30], ['m-hamstring-supine', 30], ['m-figure4', 30], ['m-chest-doorway', 30], ['m-cross-body-shoulder', 25], ['m-childs-pose', 40], ['m-breath-46', 60]]),
  R('r-after-run', 'Stretching po bieganiu', 'Post-run stretch', 'themed', 'Łydki, uda i biodra (ok. 9 min).',
    [['m-calf-wall', 30], ['m-quad-standing', 30], ['m-hamstring-supine', 30], ['m-hip-flexor', 30], ['m-figure4', 30], ['m-butterfly', 30]]),
  R('r-after-sitting', 'Rozluźnienie po długim siedzeniu', 'After long sitting', 'themed', 'Biodra, klatka piersiowa, kark (ok. 8 min).',
    [['m-hip-flexor', 30], ['m-chest-doorway', 30], ['m-thoracic-openbook', 40], ['m-neck-side', 20], ['m-cat-cow', 40], ['m-triceps-overhead', 25]]),
  R('r-daily-10', '10 minut codziennej mobilności', '10-min daily mobility', 'themed', 'Krótka rutyna na każdy dzień.',
    [['m-cat-cow', 40], ['m-worlds-greatest', 45], ['m-90-90-hip', 40], ['m-thoracic-openbook', 40], ['m-wall-slides', 40], ['m-ankle-rocks', 30], ['m-childs-pose', 40]]),
  R('r-relax-20', '20 minut relaksującego stretchingu', '20-min relaxing stretch', 'themed', 'Spokojne, statyczne pozycje i oddech.',
    [['m-diaphragmatic', 60], ['m-childs-pose', 60], ['m-thread-needle', 40], ['m-hip-flexor', 45], ['m-figure4', 45], ['m-hamstring-supine', 45], ['m-butterfly', 50], ['m-supine-twist', 40], ['m-chest-doorway', 40], ['m-breath-46', 120]]),
  // — sesje samodzielne wg obszaru —
  R('r-full', 'Całe ciało', 'Full body', 'area', 'Pełna sesja rozciągania (ok. 12 min).',
    [['m-cat-cow', 40], ['m-quad-standing', 30], ['m-hamstring-supine', 30], ['m-hip-flexor', 30], ['m-chest-doorway', 30], ['m-childs-pose', 40], ['m-supine-twist', 30]]),
  R('r-hips', 'Biodra', 'Hips', 'area', 'Mobilność i rozciąganie bioder.',
    [['m-90-90-hip', 40], ['m-hip-flexor', 40], ['m-figure4', 40], ['m-butterfly', 40], ['m-clamshell', 40]]),
  R('r-back', 'Plecy', 'Back', 'area', 'Delikatna mobilizacja i rozciąganie pleców.',
    [['m-cat-cow', 40], ['m-thread-needle', 40], ['m-childs-pose', 40], ['m-supine-twist', 30], ['m-seated-twist', 30]]),
  R('r-neck-shoulders', 'Kark i ramiona', 'Neck & shoulders', 'area', 'Rozluźnienie karku i barków.',
    [['m-neck-side', 20], ['m-cross-body-shoulder', 25], ['m-triceps-overhead', 25], ['m-wall-slides', 40], ['m-arm-circles', 30]]),
  R('r-chest', 'Klatka piersiowa', 'Chest', 'area', 'Otwieranie klatki piersiowej.',
    [['m-chest-doorway', 40], ['m-thoracic-openbook', 40], ['m-shoulder-dislocates', 40], ['m-childs-pose', 30]]),
  R('r-legs', 'Nogi', 'Legs', 'area', 'Rozciąganie ud i łydek.',
    [['m-quad-standing', 30], ['m-hamstring-supine', 30], ['m-calf-wall', 30], ['m-butterfly', 30], ['m-figure4', 30]]),
  R('r-hamstrings', 'Mięśnie kulszowo-goleniowe', 'Hamstrings', 'area', 'Statyczne, aktywne i PNF dla tyłu uda.',
    [['m-hamstring-supine', 40], ['m-active-hamstring', 30], ['m-pnf-hamstring', 20], ['m-childs-pose', 30]]),
  R('r-shoulder-mob', 'Mobilność barków', 'Shoulder mobility', 'area', 'Łopatki i staw ramienny.',
    [['m-arm-circles', 30], ['m-wall-slides', 40], ['m-shoulder-dislocates', 40], ['m-thread-needle', 40], ['m-cross-body-shoulder', 25]]),
  R('r-spine-mob', 'Mobilność kręgosłupa', 'Spine mobility', 'area', 'Zgięcie, wyprost i rotacja.',
    [['m-cat-cow', 45], ['m-thoracic-openbook', 45], ['m-thread-needle', 40], ['m-supine-twist', 30], ['m-childs-pose', 40]]),
  R('r-ankle-mob', 'Mobilność kostek', 'Ankle mobility', 'area', 'Kostki i łydki.',
    [['m-ankle-rocks', 40], ['m-calf-wall', 30], ['m-leg-swings-lat', 30]]),
  // — rozgrzewki —
  R('w-upper', 'Rozgrzewka: góra ciała', 'Warm-up: upper body', 'warmup', 'Dynamiczna rozgrzewka przed treningiem góry.',
    [['m-arm-circles', 30], ['m-cat-cow', 40], ['m-thoracic-openbook', 40], ['m-wall-slides', 40]]),
  R('w-lower', 'Rozgrzewka: dół ciała', 'Warm-up: lower body', 'warmup', 'Dynamiczna rozgrzewka przed treningiem nóg.',
    [['m-leg-swings-fb', 30], ['m-leg-swings-lat', 30], ['m-ankle-rocks', 30], ['m-clamshell', 30], ['m-worlds-greatest', 40]]),
  R('w-full', 'Rozgrzewka: całe ciało', 'Warm-up: full body', 'warmup', 'Dynamiczna rozgrzewka przed treningiem całego ciała.',
    [['m-inchworm', 40], ['m-worlds-greatest', 40], ['m-cat-cow', 30], ['m-leg-swings-fb', 30]]),
  R('w-kb', 'Rozgrzewka: kettlebell', 'Warm-up: kettlebell', 'warmup', 'Zawias, biodra, barki przed pracą z odważnikiem.',
    [['m-inchworm', 40], ['m-worlds-greatest', 40], ['m-90-90-hip', 40], ['m-wall-slides', 30], ['home-good-morning', 40]]),
];

export const ROUTINE_BY_ID: Record<string, Routine> = Object.fromEntries(ROUTINES.map((r) => [r.id, r]));

/** Czas pozycji (s): jawny, albo ze schematu (powtórzenia → ok. 3 s każde). */
export function stepSeconds(s: RoutineStep): number {
  if (s.sec) return s.sec;
  const ex = getEx(s.exId);
  if (!ex) return 30;
  return ex.scheme.seconds ?? Math.round(((ex.scheme.reps?.[0] ?? 8) + (ex.scheme.reps?.[1] ?? 8)) / 2 * 3);
}

export function routineMinutes(r: Routine): number {
  let sec = 0;
  for (const s of r.steps) {
    const ex = getEx(s.exId);
    sec += stepSeconds(s) * (ex?.scheme.perSide ? 2 : 1) + (ex?.scheme.perSide ? 5 : 0) + 5;
  }
  return Math.max(1, Math.round(sec / 60));
}

/** Rozciąganie po treningu: jedno ćwiczenie statyczne na każdą trenowaną partię. */
export const COOLDOWN_FOR: Partial<Record<MuscleId, string>> = {
  chest: 'm-chest-doorway', front_delts: 'm-cross-body-shoulder', rear_delts: 'm-cross-body-shoulder', side_delts: 'm-cross-body-shoulder',
  triceps: 'm-triceps-overhead', lats: 'm-childs-pose', mid_back: 'm-thread-needle', lower_back: 'm-supine-twist', traps: 'm-neck-side',
  quads: 'm-quad-standing', hamstrings: 'm-hamstring-supine', glutes: 'm-figure4', hip_flexors: 'm-hip-flexor',
  calves: 'm-calf-wall', adductors: 'm-butterfly', obliques: 'm-seated-twist', abs: 'm-childs-pose',
};
