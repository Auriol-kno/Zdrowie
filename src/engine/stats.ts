import type { SessionRecord } from '../core/types';
import { addDays, dateKey, parseKey, startOfWeek } from '../core/time';
import { getEx } from '../data/exercises';

export const epley = (w: number, reps: number) => (reps <= 1 ? w : w * (1 + reps / 30));

export function sessionVolume(s: SessionRecord): number {
  let v = 0;
  for (const it of s.items) for (const st of it.sets) if (st.done && st.weight && st.reps) v += st.weight * st.reps;
  return v;
}
export const sessionSets = (s: SessionRecord) => s.items.reduce((n, it) => n + it.sets.filter((x) => x.done).length, 0);

export interface WeekPoint { weekStart: string; sessions: number; volume: number; sets: number; minutes: number; mobilityMin: number }

export function weeklySeries(sessions: SessionRecord[], weeks = 8, today = new Date()): WeekPoint[] {
  const start0 = startOfWeek(today);
  const pts: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(start0, -7 * i);
    const we = addDays(ws, 7);
    const inWeek = sessions.filter((s) => s.date >= dateKey(ws) && s.date < dateKey(we));
    pts.push({
      weekStart: dateKey(ws), sessions: inWeek.length,
      volume: inWeek.reduce((n, s) => n + sessionVolume(s), 0),
      sets: inWeek.reduce((n, s) => n + sessionSets(s), 0),
      minutes: Math.round(inWeek.reduce((n, s) => n + s.durationSec, 0) / 60),
      mobilityMin: Math.round(inWeek.reduce((n, s) => n + mobilitySeconds(s), 0) / 60),
    });
  }
  return pts;
}

export function mobilitySeconds(s: SessionRecord): number {
  let sec = 0;
  for (const it of s.items) {
    const ex = getEx(it.exId);
    if (!ex || ex.module !== 'mobility') continue;
    for (const st of it.sets) if (st.done) sec += (st.seconds ?? 0) * (ex.scheme.perSide ? 2 : 1) || 0;
  }
  return sec;
}

/** Seria aktywnych dni: kolejne dni z co najmniej jedną sesją, kończąca się dziś lub wczoraj. */
export function activeStreak(sessions: SessionRecord[], today = new Date()): number {
  const days = new Set(sessions.map((s) => s.date));
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(dateKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dateKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

export interface Pr { exId: string; weight: number; reps: number; e1rm: number; date: string }

export function personalRecords(sessions: SessionRecord[]): Record<string, Pr> {
  const best: Record<string, Pr> = {};
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    for (const it of s.items) for (const st of it.sets) {
      if (!st.done || !st.weight || !st.reps) continue;
      const e = epley(st.weight, st.reps);
      const cur = best[it.exId];
      if (!cur || e > cur.e1rm + 1e-9) best[it.exId] = { exId: it.exId, weight: st.weight, reps: st.reps, e1rm: Math.round(e * 10) / 10, date: s.date };
    }
  }
  return best;
}

/** Nowe rekordy względem historii (do podsumowania sesji). */
export function newRecords(history: SessionRecord[], session: SessionRecord): { exId: string; weight: number; reps: number }[] {
  const before = personalRecords(history);
  const out: { exId: string; weight: number; reps: number }[] = [];
  for (const it of session.items) {
    let top: { weight: number; reps: number; e: number } | null = null;
    for (const st of it.sets) {
      if (!st.done || !st.weight || !st.reps) continue;
      const e = epley(st.weight, st.reps);
      if (!top || e > top.e) top = { weight: st.weight, reps: st.reps, e };
    }
    if (top && (!before[it.exId] || top.e > before[it.exId].e1rm + 1e-9)) out.push({ exId: it.exId, weight: top.weight, reps: top.reps });
  }
  return out;
}

export function exerciseHistory(sessions: SessionRecord[], exId: string): { date: string; topWeight: number; reps: number; volume: number; e1rm: number }[] {
  const out = [];
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const it = s.items.find((i) => i.exId === exId);
    if (!it) continue;
    const done = it.sets.filter((x) => x.done);
    if (!done.length) continue;
    const top = done.reduce((b, x) => ((x.weight ?? 0) >= (b.weight ?? 0) ? x : b), done[0]);
    out.push({
      date: s.date, topWeight: top.weight ?? 0, reps: top.reps ?? 0,
      volume: done.reduce((n, x) => n + (x.weight ?? 0) * (x.reps ?? 0), 0),
      e1rm: top.weight && top.reps ? Math.round(epley(top.weight, top.reps) * 10) / 10 : 0,
    });
  }
  return out;
}

export function lastPerformance(sessions: SessionRecord[], exId: string): { date: string; sets: { reps?: number; weight?: number; seconds?: number }[] } | null {
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  for (const s of sorted) {
    const it = s.items.find((i) => i.exId === exId);
    const done = it?.sets.filter((x) => x.done) ?? [];
    if (done.length) return { date: s.date, sets: done.map((x) => ({ reps: x.reps, weight: x.weight, seconds: x.seconds })) };
  }
  return null;
}

/** Heatmapa regularności: liczba sesji w dniach ostatnich N tygodni. */
export function consistencyGrid(sessions: SessionRecord[], weeks = 10, today = new Date()): { date: string; count: number }[][] {
  const counts: Record<string, number> = {};
  for (const s of sessions) counts[s.date] = (counts[s.date] ?? 0) + 1;
  const start = addDays(startOfWeek(today), -7 * (weeks - 1));
  const cols: { date: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) { const k = dateKey(addDays(start, w * 7 + d)); col.push({ date: k, count: counts[k] ?? 0 }); }
    cols.push(col);
  }
  return cols;
}

export function daysSince(sessions: SessionRecord[], today = new Date()): number | null {
  if (!sessions.length) return null;
  const last = sessions.reduce((m, s) => (s.date > m ? s.date : m), '0000-00-00');
  return Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - parseKey(last).getTime()) / 86400000);
}
