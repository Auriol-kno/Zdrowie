// Silnik timerów oparty na znacznikach czasu (odporny na tło/uśpienie karty).

export type TimerMode = 'stopwatch' | 'countdown' | 'rest' | 'tabata' | 'emom' | 'amrap' | 'intervals' | 'stretch';
export type PhaseKind = 'prep' | 'work' | 'rest';

export interface Phase {
  label: string;
  kind: PhaseKind;
  sec: number;
  next?: string; // etykieta następnej fazy
  round?: number;
  rounds?: number;
}

export interface TimerConfig {
  mode: TimerMode;
  seconds?: number; // countdown / rest / amrap (łącznie)
  work?: number;
  rest?: number;
  rounds?: number;
  prep?: number;
  minutes?: number; // EMOM
  positions?: { label: string; sec: number; perSide?: boolean }[];
  switchSec?: number; // przerwa na zmianę strony
}

export function buildSchedule(c: TimerConfig): Phase[] {
  const out: Phase[] = [];
  const prep = c.prep ?? 5;
  switch (c.mode) {
    case 'stopwatch': return [];
    case 'countdown':
    case 'rest':
      return [{ label: c.mode === 'rest' ? 'Odpoczynek' : 'Odliczanie', kind: c.mode === 'rest' ? 'rest' : 'work', sec: Math.max(1, c.seconds ?? 60) }];
    case 'tabata': {
      const rounds = c.rounds ?? 8; const work = c.work ?? 20; const rest = c.rest ?? 10;
      if (prep > 0) out.push({ label: 'Przygotuj się', kind: 'prep', sec: prep });
      for (let r = 1; r <= rounds; r++) {
        out.push({ label: 'Praca', kind: 'work', sec: work, round: r, rounds });
        if (r < rounds) out.push({ label: 'Odpoczynek', kind: 'rest', sec: rest, round: r, rounds });
      }
      break;
    }
    case 'intervals': {
      const rounds = c.rounds ?? 6; const work = c.work ?? 40; const rest = c.rest ?? 20;
      if (prep > 0) out.push({ label: 'Przygotuj się', kind: 'prep', sec: prep });
      for (let r = 1; r <= rounds; r++) {
        out.push({ label: 'Praca', kind: 'work', sec: work, round: r, rounds });
        if (r < rounds && rest > 0) out.push({ label: 'Odpoczynek', kind: 'rest', sec: rest, round: r, rounds });
      }
      break;
    }
    case 'emom': {
      const minutes = c.minutes ?? 10; const work = Math.min(c.work ?? 40, 60);
      if (prep > 0) out.push({ label: 'Przygotuj się', kind: 'prep', sec: prep });
      for (let m = 1; m <= minutes; m++) {
        out.push({ label: `Minuta ${m}`, kind: 'work', sec: work, round: m, rounds: minutes });
        if (work < 60) out.push({ label: 'Reszta minuty', kind: 'rest', sec: 60 - work, round: m, rounds: minutes });
      }
      break;
    }
    case 'amrap': {
      if (prep > 0) out.push({ label: 'Przygotuj się', kind: 'prep', sec: prep });
      out.push({ label: 'AMRAP', kind: 'work', sec: Math.max(60, c.seconds ?? 600) });
      break;
    }
    case 'stretch': {
      if (prep > 0) out.push({ label: 'Przygotuj się', kind: 'prep', sec: prep });
      const sw = c.switchSec ?? 5;
      for (const p of c.positions ?? []) {
        if (p.perSide) {
          out.push({ label: `${p.label} — strona 1`, kind: 'work', sec: p.sec });
          out.push({ label: 'Zmień stronę', kind: 'rest', sec: sw });
          out.push({ label: `${p.label} — strona 2`, kind: 'work', sec: p.sec });
        } else out.push({ label: p.label, kind: 'work', sec: p.sec });
      }
      break;
    }
  }
  // uzupełnij "next"
  for (let i = 0; i < out.length; i++) {
    const n = out.slice(i + 1).find((p) => p.kind === 'work');
    out[i].next = n?.label;
  }
  return out;
}

export interface PhasePos {
  index: number;
  phase: Phase | null;
  remaining: number; // sekundy do końca fazy (zaokrąglone w górę)
  elapsedInPhase: number;
  total: number;
  finished: boolean;
  totalSec: number;
  elapsedSec: number;
}

export function phaseAt(schedule: Phase[], elapsedMs: number): PhasePos {
  const totalSec = schedule.reduce((s, p) => s + p.sec, 0);
  let acc = 0;
  for (let i = 0; i < schedule.length; i++) {
    const endMs = (acc + schedule[i].sec) * 1000;
    if (elapsedMs < endMs) {
      const inPhaseMs = elapsedMs - acc * 1000;
      return { index: i, phase: schedule[i], remaining: Math.ceil((schedule[i].sec * 1000 - inPhaseMs) / 1000), elapsedInPhase: inPhaseMs / 1000, total: schedule[i].sec, finished: false, totalSec, elapsedSec: elapsedMs / 1000 };
    }
    acc += schedule[i].sec;
  }
  return { index: schedule.length, phase: null, remaining: 0, elapsedInPhase: 0, total: 0, finished: true, totalSec, elapsedSec: totalSec };
}

/** Stan uruchomionego timera: odporny na pauzy i tło. */
export interface RunState { startedAt: number | null; pausedAt: number | null; accumMs: number }

export const idleRun = (): RunState => ({ startedAt: null, pausedAt: null, accumMs: 0 });
export function startRun(s: RunState, now: number): RunState {
  if (s.startedAt !== null && s.pausedAt === null) return s;
  return { startedAt: now, pausedAt: null, accumMs: s.accumMs };
}
export function pauseRun(s: RunState, now: number): RunState {
  if (s.startedAt === null || s.pausedAt !== null) return s;
  return { startedAt: null, pausedAt: now, accumMs: s.accumMs + (now - s.startedAt) };
}
export function elapsedMs(s: RunState, now: number): number {
  return s.accumMs + (s.startedAt !== null ? now - s.startedAt : 0);
}
