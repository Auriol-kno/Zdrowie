// Łagodna progresja ciężaru (podwójna progresja) — bez gwałtownych skoków.
import type { Exercise, SessionRecord } from '../core/types';
import { lastPerformance } from './stats';

export const MAX_JUMP_PCT = 0.05; // nigdy więcej niż +5% naraz (poza minimalnym krokiem)

export function stepFor(ex: Exercise): number {
  if (ex.equipment.includes('kettlebell')) return 2; // kolejny rozmiar odważnika bywa +4 kg — sugerujemy małe kroki objętością
  if (ex.equipment.includes('dumbbells')) return 1;
  if (ex.equipment.includes('barbell')) return 2.5;
  return 2.5;
}

export interface Suggestion { weight: number | null; reps: number | null; reason: string }

export function suggestNext(ex: Exercise, history: SessionRecord[]): Suggestion {
  const last = lastPerformance(history, ex.id);
  const range = ex.scheme.reps;
  if (!last || !range) return { weight: null, reps: null, reason: 'Brak historii — zacznij od lekkiego, komfortowego ciężaru.' };
  const weights = last.sets.map((s) => s.weight ?? 0).filter((w) => w > 0);
  if (!weights.length) return { weight: null, reps: null, reason: 'Brak zapisanych ciężarów.' };
  const w = Math.max(...weights);
  const hitTop = last.sets.every((s) => (s.reps ?? 0) >= range[1]);
  if (!hitTop) return { weight: w, reps: range[1], reason: `Utrzymaj ${w} kg i dobij do ${range[1]} powtórzeń we wszystkich seriach.` };
  const step = stepFor(ex);
  const cap = Math.max(step, w * MAX_JUMP_PCT);
  const inc = Math.min(step, cap);
  const nextW = Math.round((w + inc) * 10) / 10;
  return { weight: nextW, reps: range[0], reason: `Wszystkie serie na górze zakresu — spróbuj ${nextW} kg (małe +${inc} kg).` };
}
