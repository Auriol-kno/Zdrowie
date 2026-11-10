// Wspólne akcje UI: start treningu, dodanie ćwiczenia do treningu/planu.
import type { Exercise, Plan, PlanDay, PlanItem } from '../core/types';
import { getState, nav, savePlan, setDraft } from '../core/store';
import { itemFromPlan, startDraft } from '../engine/workout';
import { routineItems } from '../engine/generator';
import type { Routine } from '../data/routines';
import { t } from '../core/i18n';

export function planItemFromEx(ex: Exercise): PlanItem {
  const s = ex.scheme;
  return { exId: ex.id, sets: s.sets, reps: s.reps, seconds: s.seconds, rest: s.rest, section: 'main' };
}

export function addExerciseToWorkout(ex: Exercise) {
  const d = getState().draft;
  if (d) {
    void setDraft({ ...d, items: [...d.items, itemFromPlan(planItemFromEx(ex))] });
    nav.toast(t('Dodano „{n}” do trwającego treningu', { n: ex.pl }));
  } else {
    void setDraft(startDraft({ title: t('Trening własny'), kind: 'quick', items: [planItemFromEx(ex)] }));
    nav.toast(t('Utworzono trening z „{n}”', { n: ex.pl }));
  }
}

export function addExerciseToPlan(plan: Plan, dayIdx: number, ex: Exercise) {
  const days = plan.days.map((d, i) => {
    if (i !== dayIdx) return d;
    const kind = d.kind === 'rest' ? (ex.module === 'mobility' ? 'mobility' : 'workout') : d.kind;
    return { ...d, kind, title: d.kind === 'rest' ? t('Trening własny') : d.title, items: [...d.items, planItemFromEx(ex)] } as Plan['days'][number];
  });
  void savePlan({ ...plan, days });
  nav.toast(t('Dodano do planu'));
}

export function startRoutineWorkout(r: Routine) {
  const s = getState();
  if (s.draft) { nav.toast(t('Najpierw zakończ trwający trening.')); nav.tab('workout'); return; }
  const items = routineItems(r, undefined);
  void setDraft(startDraft({ title: r.pl, kind: 'mobility', items }));
  nav.tab('workout');
}

/** Krótsza wersja dnia: zostaje rozgrzewka i najważniejsze (pierwsze) ćwiczenia główne mieszczące się w budżecie czasu. */
export function shortVersion(day: PlanDay, minutes: number, planId?: string, dayIndex?: number) {
  const secOf = (it: PlanItem) => it.sets * ((it.seconds ?? ((it.reps ? (it.reps[0] + it.reps[1]) / 2 : 10) * 3.5)) + it.rest);
  const warm = day.items.filter((i) => i.section === 'warmup').slice(0, 3);
  const main = day.items.filter((i) => i.section !== 'warmup' && i.section !== 'cooldown');
  let budget = minutes * 60 - warm.reduce((n, i) => n + secOf(i), 0);
  const picked: PlanItem[] = [];
  for (const it of main) {
    const sec = secOf(it);
    if (budget - sec < 0 && picked.length >= 2) continue;
    picked.push(it); budget -= sec;
  }
  const cool = day.items.filter((i) => i.section === 'cooldown').slice(0, 2);
  return startDraft({ title: `${day.title} (${t('krótko')})`, kind: day.kind, items: [...warm, ...picked, ...cool], planId, dayIndex });
}
