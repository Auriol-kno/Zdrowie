// Czysta logika sesji treningowej (bez UI) — łatwa do testowania i odzyskiwania po odświeżeniu.
import type { PlanDay, PlanItem, SessionRecord, SetLog, WorkoutDraft, WorkoutItem } from '../core/types';
import { dateKey, uid } from '../core/time';
import { getEx } from '../data/exercises';

export function itemFromPlan(p: PlanItem): WorkoutItem {
  const ex = getEx(p.exId);
  const reps = p.reps ? Math.round((p.reps[0] + p.reps[1]) / 2) : undefined;
  const sets: SetLog[] = Array.from({ length: Math.max(1, p.sets) }, () => ({
    done: false,
    targetReps: p.seconds ? undefined : reps,
    targetSeconds: p.seconds,
    weight: p.weight,
  }));
  void ex;
  return { exId: p.exId, section: p.section, rest: p.rest, hold: p.hold, perSide: p.perSide, sets };
}

export function startDraft(opts: { title: string; kind?: WorkoutDraft['kind']; items: PlanItem[]; planId?: string; dayIndex?: number }, now = Date.now()): WorkoutDraft {
  return {
    id: uid('w'), title: opts.title, kind: opts.kind ?? 'custom', planId: opts.planId, dayIndex: opts.dayIndex,
    startedAt: now, pausedAt: null, pausedTotalMs: 0,
    items: opts.items.map(itemFromPlan), itemIdx: 0, setIdx: 0,
    restEndsAt: null, restTotal: 0, setStartedAt: now,
  };
}

export function draftFromDay(day: PlanDay, planId?: string, dayIndex?: number, now = Date.now()): WorkoutDraft {
  return startDraft({ title: day.title, kind: day.kind, items: day.items, planId, dayIndex }, now);
}

export const activeMs = (d: WorkoutDraft, now = Date.now()) =>
  Math.max(0, (d.pausedAt ?? now) - d.startedAt - d.pausedTotalMs);

export function togglePause(d: WorkoutDraft, now = Date.now()): WorkoutDraft {
  if (d.pausedAt === null) {
    return { ...d, pausedAt: now };
  }
  const paused = now - d.pausedAt;
  return { ...d, pausedAt: null, pausedTotalMs: d.pausedTotalMs + paused, restEndsAt: d.restEndsAt !== null ? d.restEndsAt + paused : null };
}

export interface Cursor { item: WorkoutItem; itemIdx: number; setIdx: number }

/** Następna niewykonana seria po (itemIdx,setIdx) — pomija ćwiczenia pominięte. */
export function nextCursor(d: WorkoutDraft, from?: { itemIdx: number; setIdx: number }): { itemIdx: number; setIdx: number } | null {
  let i = from ? from.itemIdx : d.itemIdx;
  let s = from ? from.setIdx + 1 : d.setIdx;
  for (; i < d.items.length; i++, s = 0) {
    const it = d.items[i];
    if (it.skipped) continue;
    for (; s < it.sets.length; s++) if (!it.sets[s].done && !it.sets[s].skipped) return { itemIdx: i, setIdx: s };
  }
  return null;
}

export interface SetResult { reps?: number; weight?: number; seconds?: number }

export function completeSet(d: WorkoutDraft, r: SetResult, opts: { autoRest: boolean; now?: number }): WorkoutDraft {
  const now = opts.now ?? Date.now();
  const items = d.items.map((it, i) => (i !== d.itemIdx ? it : {
    ...it,
    sets: it.sets.map((s, k) => (k !== d.setIdx ? s : { ...s, done: true, reps: r.reps ?? s.targetReps, weight: r.weight ?? s.weight, seconds: r.seconds ?? s.targetSeconds })),
  }));
  const next0 = { ...d, items };
  const nxt = nextCursor(next0, { itemIdx: d.itemIdx, setIdx: d.setIdx });
  if (!nxt) return { ...next0, restEndsAt: null, restTotal: 0 };
  const rest = items[d.itemIdx].rest;
  const sameItem = nxt.itemIdx === d.itemIdx;
  const restSec = sameItem ? rest : Math.min(rest, 60);
  return {
    ...next0, itemIdx: nxt.itemIdx, setIdx: nxt.setIdx, setStartedAt: now,
    restEndsAt: opts.autoRest && restSec > 0 ? now + restSec * 1000 : null,
    restTotal: opts.autoRest ? restSec : 0,
  };
}

export function skipRest(d: WorkoutDraft): WorkoutDraft { return { ...d, restEndsAt: null, restTotal: 0 }; }
export function addRest(d: WorkoutDraft, sec: number, now = Date.now()): WorkoutDraft {
  const base = d.restEndsAt ?? now;
  return { ...d, restEndsAt: base + sec * 1000, restTotal: d.restTotal + sec };
}

export function skipExercise(d: WorkoutDraft, now = Date.now()): WorkoutDraft {
  const items = d.items.map((it, i) => (i === d.itemIdx ? { ...it, skipped: true } : it));
  const nxt = nextCursor({ ...d, items }, { itemIdx: d.itemIdx, setIdx: -1 });
  const base = { ...d, items, restEndsAt: null, restTotal: 0, setStartedAt: now };
  return nxt ? { ...base, itemIdx: nxt.itemIdx, setIdx: nxt.setIdx } : base;
}

export function editSet(d: WorkoutDraft, itemIdx: number, setIdx: number, patch: Partial<SetLog>): WorkoutDraft {
  return { ...d, items: d.items.map((it, i) => (i !== itemIdx ? it : { ...it, sets: it.sets.map((s, k) => (k === setIdx ? { ...s, ...patch } : s)) })) };
}

export function addSet(d: WorkoutDraft, itemIdx: number): WorkoutDraft {
  return { ...d, items: d.items.map((it, i) => {
    if (i !== itemIdx) return it;
    const last = it.sets[it.sets.length - 1];
    return { ...it, sets: [...it.sets, { done: false, targetReps: last?.targetReps, targetSeconds: last?.targetSeconds, weight: last?.weight }] };
  }) };
}

export function isFinished(d: WorkoutDraft): boolean { return nextCursor(d, { itemIdx: 0, setIdx: -1 }) === null; }

export function doneSets(d: WorkoutDraft): number {
  return d.items.reduce((n, it) => n + it.sets.filter((s) => s.done).length, 0);
}

export function finishDraft(d: WorkoutDraft, extra: { rpe?: number; mood?: number; notes?: string; distanceM?: number }, now = Date.now()): SessionRecord {
  const items = d.items
    .map((it) => ({ ...it, sets: it.sets.filter((s) => s.done || s.skipped) }))
    .filter((it) => it.sets.length > 0);
  return {
    id: d.id, date: dateKey(d.startedAt), startedAt: d.startedAt, endedAt: now,
    durationSec: Math.round(activeMs(d, now) / 1000), title: d.title, kind: d.kind,
    planId: d.planId, dayIndex: d.dayIndex, items, ...extra,
  };
}

export function restRemainingSec(d: WorkoutDraft, now = Date.now()): number {
  if (d.restEndsAt === null) return 0;
  const ref = d.pausedAt ?? now;
  return Math.max(0, Math.ceil((d.restEndsAt - ref) / 1000));
}
