// Brzmienia sygnałów prowadzenia (czysta logika; audio je tylko odtwarza).
export type BeatStyle = 'soft' | 'click' | 'wood' | 'beep';
export interface Note { freq: number; ms: number; gain: number; type: OscillatorType }

export const BEAT_STYLES: { id: BeatStyle; pl: string }[] = [
  { id: 'soft', pl: 'Pik' }, { id: 'click', pl: 'Klik' }, { id: 'wood', pl: 'Drewno' }, { id: 'beep', pl: 'Sygnał' },
];

const SOFT: Record<BeatStyle, Note[]> = {
  soft: [{ freq: 520, ms: 45, gain: 0.06, type: 'sine' }],
  click: [{ freq: 1800, ms: 22, gain: 0.05, type: 'square' }],
  wood: [{ freq: 330, ms: 50, gain: 0.1, type: 'triangle' }],
  beep: [{ freq: 880, ms: 70, gain: 0.07, type: 'sine' }],
};
const LOUD: Record<BeatStyle, Note[]> = {
  soft: [{ freq: 980, ms: 110, gain: 0.5, type: 'sine' }, { freq: 1470, ms: 70, gain: 0.22, type: 'sine' }],
  click: [{ freq: 2200, ms: 45, gain: 0.35, type: 'square' }, { freq: 1100, ms: 60, gain: 0.3, type: 'triangle' }],
  wood: [{ freq: 440, ms: 90, gain: 0.55, type: 'triangle' }, { freq: 880, ms: 50, gain: 0.2, type: 'sine' }],
  beep: [{ freq: 1320, ms: 140, gain: 0.5, type: 'sine' }],
};

/** Nuty delikatnego tyku albo głośniejszego sygnału (ostatnie 3) dla wybranego brzmienia. */
export const beatNotes = (style: BeatStyle, loud: boolean): Note[] => (loud ? LOUD : SOFT)[BEAT_STYLES.some((b) => b.id === style) ? style : 'soft'];

/** Mnożnik głośności z suwaka 0–100 % (70 % = nominalna głośność, 100 % = 1,4×). */
export const volumeGain = (pct: number | undefined): number => Math.max(0, Math.min(100, pct ?? 70)) / 70;
