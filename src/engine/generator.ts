// Lokalny generator planów oparty na regułach (to NIE jest AI — brak modelu, wyniki deterministyczne dla danego seed).
import type { EquipmentId, Exercise, GeneratorInput, GoalId, Level, Limitation, Module, MuscleId, Plan, PlanDay, PlanItem } from '../core/types';
import { mulberry32, uid } from '../core/time';
import { EXERCISES, equipmentOk, estimateSec, getEx } from '../data/exercises';
import { COOLDOWN_FOR, ROUTINE_BY_ID, stepSeconds, type Routine } from '../data/routines';

export const GENERATOR_VERSION = 1;
const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };

const LIMIT_FLAGS: Record<Limitation, string[]> = {
  knees: ['impact', 'deep-knee'], back: ['spinal-load'], shoulders: ['overhead'], wrists: ['wrist-load'], neck: ['neck'],
};

type DayType = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'conditioning';
type Slot = MuscleId[];
const SLOTS: Record<DayType, Slot[]> = {
  full: [['quads', 'glutes'], ['chest'], ['lats', 'mid_back'], ['hamstrings', 'glutes'], ['front_delts', 'side_delts'], ['abs', 'obliques']],
  upper: [['chest'], ['lats', 'mid_back'], ['front_delts', 'side_delts'], ['lats'], ['biceps'], ['triceps']],
  lower: [['quads'], ['hamstrings', 'glutes'], ['glutes'], ['quads', 'adductors'], ['calves'], ['abs']],
  push: [['chest'], ['front_delts'], ['chest', 'front_delts'], ['side_delts'], ['triceps'], ['triceps']],
  pull: [['lats'], ['mid_back'], ['lats', 'mid_back'], ['rear_delts'], ['biceps'], ['biceps', 'forearms']],
  legs: [['quads'], ['hamstrings'], ['quads', 'glutes'], ['glutes'], ['calves'], ['abs']],
  conditioning: [['quads', 'glutes'], ['chest', 'abs'], ['hamstrings', 'glutes'], ['lats', 'mid_back'], ['abs', 'obliques'], ['calves', 'quads']],
};

export const DAY_TITLES: Record<DayType, string> = {
  full: 'Całe ciało', upper: 'Góra ciała', lower: 'Dół ciała', push: 'Push (pchanie)', pull: 'Pull (ciągnięcie)', legs: 'Nogi', conditioning: 'Kondycja i obwód',
};

const WARMUP_BY_TYPE: Record<DayType, string> = { full: 'w-full', upper: 'w-upper', lower: 'w-lower', push: 'w-upper', pull: 'w-upper', legs: 'w-lower', conditioning: 'w-full' };

export interface RoutineFilter { level: Level; equipment: EquipmentId[]; limitations: Limitation[] }

/** Pozycje rutyny jako elementy planu; opcjonalnie odfiltrowane wg poziomu, sprzętu i ograniczeń. */
export function routineItems(r: Routine, f?: RoutineFilter): PlanItem[] {
  const bad = new Set((f?.limitations ?? []).flatMap((l) => LIMIT_FLAGS[l]));
  return r.steps
    .filter((s) => {
      if (!f) return true;
      const e = getEx(s.exId);
      return !!e && LEVEL_RANK[e.level] <= LEVEL_RANK[f.level] && equipmentOk(e, f.equipment) && !e.flags?.some((x) => bad.has(x));
    })
    .map((s) => ({ exId: s.exId, sec: undefined, sets: 1, seconds: stepSeconds(s), rest: 8, section: 'main' as const }))
    .map(({ sec, ...rest }) => { void sec; return rest; });
}

function isCompound(e: Exercise) { return new Set([...e.primary, ...e.secondary]).size >= 4; }
const strengthLike = (e: Exercise) => e.module !== 'mobility' && e.module !== 'posture' && e.cat !== 'cardio';

/** Parametry serii dla celu/poziomu. */
export function itemFor(e: Exercise, goal: GoalId, level: Level, compound = isCompound(e)): PlanItem {
  const sc = e.scheme;
  if (sc.seconds || !sc.reps) {
    return { exId: e.id, sets: Math.max(2, sc.sets - (level === 'beginner' ? 1 : 0)), seconds: sc.seconds ?? 30, rest: Math.min(sc.rest, goal === 'conditioning' || goal === 'fatloss' ? 30 : sc.rest), section: 'main' };
  }
  let sets = 3; let reps: [number, number] = [8, 12]; let rest = compound ? 90 : 60;
  switch (goal) {
    case 'strength': sets = compound ? 4 : 3; reps = compound ? [4, 6] : [6, 8]; rest = compound ? 150 : 90; break;
    case 'muscle': sets = compound ? 4 : 3; reps = [8, 12]; rest = compound ? 90 : 60; break;
    case 'fatloss': sets = 3; reps = [12, 15]; rest = 45; break;
    case 'conditioning': sets = 3; reps = [15, 20]; rest = 30; break;
    default: sets = 3; reps = [10, 12]; rest = 60;
  }
  // zakres powtórzeń dopasowujemy do bezpiecznego zakresu ćwiczenia (np. ćwiczenia techniczne)
  reps = [Math.max(reps[0], Math.min(sc.reps[0], reps[1])), Math.min(Math.max(reps[1], sc.reps[0]), Math.max(sc.reps[1], reps[0]))];
  if (reps[0] > reps[1]) reps = [sc.reps[0], sc.reps[1]];
  if (sc.reps[1] <= 6) { reps = sc.reps; rest = Math.max(rest, sc.rest); } // ćwiczenia techniczne/mocowe zostają w swoim zakresie
  if (level === 'beginner') sets = Math.max(2, sets - 1);
  if (level === 'advanced' && compound) sets = Math.min(5, sets + 1);
  return { exId: e.id, sets, reps, rest, section: 'main' };
}

export interface Pool { modules: Module[]; equipment: EquipmentId[]; level: Level; limitations: Limitation[]; location: 'gym' | 'home' | 'both' }

export function poolFor(p: Pool): Exercise[] {
  const bad = new Set(p.limitations.flatMap((l) => LIMIT_FLAGS[l]));
  return EXERCISES.filter((e) => {
    if (!p.modules.includes(e.module)) return false;
    if (!strengthLike(e) && e.module !== 'kettlebell') return false;
    if (e.module === 'mobility' || e.module === 'posture') return false;
    if (LEVEL_RANK[e.level] > LEVEL_RANK[p.level]) return false;
    if (p.location !== 'both' && !e.location.includes(p.location)) return false;
    if (!equipmentOk(e, p.equipment)) return false;
    if (e.flags?.some((f) => bad.has(f))) return false;
    return true;
  });
}

/** Zastąp ćwiczenia zbyt trudne / niedostępne najbliższą alternatywą (lub usuń). */
export function adaptItems(items: PlanItem[], level: Level, equipment: EquipmentId[], limitations: Limitation[] = []): PlanItem[] {
  const bad = new Set(limitations.flatMap((l) => LIMIT_FLAGS[l]));
  const ok = (e: Exercise) => LEVEL_RANK[e.level] <= LEVEL_RANK[level] && equipmentOk(e, equipment) && !e.flags?.some((f) => bad.has(f));
  const out: PlanItem[] = [];
  for (const it of items) {
    const e = getEx(it.exId);
    if (!e) continue;
    if (ok(e)) { out.push(it); continue; }
    const alt = e.alt.map(getEx).find((a): a is Exercise => !!a && ok(a) && a.module !== 'mobility' && a.module !== 'posture');
    if (alt) out.push({ ...it, exId: alt.id, seconds: alt.scheme.seconds, reps: alt.scheme.seconds ? undefined : (it.reps ?? alt.scheme.reps) });
  }
  return out;
}

function pickSlot(pool: Exercise[], slot: Slot, used: Set<string>, recent: Set<string>, preferred: Module[], rand: () => number, wantCompound: boolean): Exercise | null {
  const cands = pool.filter((e) => e.primary.some((m) => slot.includes(m)) && !used.has(e.id));
  if (!cands.length) return null;
  const scored = cands.map((e) => {
    let s = rand() * 1.5;
    if (wantCompound && isCompound(e)) s += 3;
    if (!wantCompound && !isCompound(e)) s += 1;
    if (preferred.includes(e.module)) s += 1.5;
    if (recent.has(e.id)) s -= 2.5;
    if (slot.includes(e.primary[0])) s += 1;
    return { e, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].e;
}

export function cooldownItems(items: PlanItem[], max = 4): PlanItem[] {
  const count = new Map<string, number>();
  for (const it of items) {
    const e = getEx(it.exId);
    for (const m of e?.primary ?? []) {
      const id = COOLDOWN_FOR[m];
      if (id) count.set(id, (count.get(id) ?? 0) + 1);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([id]) => {
    const e = getEx(id)!;
    return { exId: id, sets: 1, seconds: e.scheme.seconds ?? 30, rest: 8, section: 'cooldown' as const };
  });
}

export function decorate(type: DayType, main: PlanItem[], withWarmup: boolean, withCooldown: boolean, level: Level, equipment: EquipmentId[]): PlanItem[] {
  const out: PlanItem[] = [];
  if (withWarmup) {
    const r = ROUTINE_BY_ID[WARMUP_BY_TYPE[type]];
    const wu = routineItems(r, { level, equipment, limitations: [] }).map((i) => ({ ...i, section: 'warmup' as const }));
    out.push(...wu.slice(0, 4));
  }
  out.push(...main);
  if (withCooldown) out.push(...cooldownItems(main));
  return out;
}

const PATTERNS: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
const SPLITS: Record<number, DayType[]> = {
  1: ['full'], 2: ['full', 'full'], 3: ['full', 'full', 'full'], 4: ['upper', 'lower', 'upper', 'lower'],
  5: ['push', 'pull', 'legs', 'upper', 'lower'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], 7: ['push', 'pull', 'legs', 'upper', 'lower', 'full', 'full'],
};

export function modulesFor(input: Pick<GeneratorInput, 'preferred' | 'location' | 'equipment'>): Module[] {
  const mods = new Set<Module>(input.preferred.filter((m) => m !== 'mobility' && m !== 'posture'));
  if (mods.size === 0) {
    if (input.location !== 'home') mods.add('gym');
    if (input.location !== 'gym') mods.add('home');
    if (input.equipment.includes('kettlebell')) mods.add('kettlebell');
  }
  if (input.location === 'home') mods.delete('gym');
  if (!input.equipment.includes('kettlebell')) mods.delete('kettlebell');
  if (mods.size === 0) mods.add('home');
  return [...mods];
}

export function generatePlan(input: GeneratorInput, name?: string, now = Date.now()): Plan {
  const rand = mulberry32(input.seed);
  const days = Math.min(7, Math.max(1, Math.round(input.days)));
  const mobilityGoal = input.goal === 'mobility' || input.goal === 'flexibility';
  const strengthDays = mobilityGoal ? Math.min(days, days >= 4 ? 2 : 1) : days;
  const split = (SPLITS[strengthDays] ?? SPLITS[3]).slice();
  if ((input.goal === 'conditioning' || input.goal === 'fatloss') && strengthDays >= 3) split[split.length - 1] = 'conditioning';
  const pattern = mobilityGoal ? (strengthDays === 1 ? [0] : [0, 3]) : PATTERNS[strengthDays];
  const modules = modulesFor(input);
  const pool = poolFor({ modules, equipment: input.equipment, level: input.level, limitations: input.limitations, location: input.location });
  const recent = new Set(input.recentExerciseIds);
  const budget = Math.max(10, input.minutes - (input.withWarmup ? 5 : 0) - (input.withCooldown ? 5 : 0));
  const planDays: PlanDay[] = Array.from({ length: 7 }, () => ({ kind: 'rest', title: 'Odpoczynek', items: [] }));
  const usedWeek = new Set<string>();

  split.forEach((type, i) => {
    const day = pattern[i];
    const used = new Set<string>();
    const items: PlanItem[] = [];
    let spent = 0;
    for (let s = 0; s < SLOTS[type].length; s++) {
      const e = pickSlot(pool, SLOTS[type][s], new Set([...used, ...(type === 'full' ? usedWeek : [])]), recent, input.preferred, rand, s < 2)
        ?? pickSlot(pool, SLOTS[type][s], used, recent, input.preferred, rand, s < 2);
      if (!e) continue;
      const it = itemFor(e, input.goal, input.level);
      const t = estimateSec({ ...e, scheme: { ...e.scheme, rest: it.rest } }, it.sets);
      if (spent + t > budget * 60 && items.length >= 3) break;
      spent += t; used.add(e.id); usedWeek.add(e.id); items.push(it);
    }
    planDays[day] = { kind: 'workout', title: DAY_TITLES[type], items: decorate(type, items, input.withWarmup, input.withCooldown, input.level, input.equipment) };
  });

  if (input.withMobilityDays || mobilityGoal) {
    const free = [1, 5, 3, 6, 2, 4, 0].filter((d) => planDays[d].kind === 'rest');
    const want = mobilityGoal ? Math.max(1, days - strengthDays) : (days <= 3 ? 2 : 1);
    const themes = mobilityGoal ? ['r-morning', 'r-hips', 'r-spine-mob', 'r-relax-20', 'r-full'] : ['r-daily-10', 'r-relax-20'];
    free.slice(0, want).forEach((d, k) => {
      const r = ROUTINE_BY_ID[themes[k % themes.length]];
      planDays[d] = { kind: 'mobility', title: r.pl, items: routineItems(r, { level: input.level, equipment: input.equipment, limitations: input.limitations }) };
    });
  }

  return {
    id: uid('plan'), name: name ?? 'Plan wygenerowany', createdAt: now, days: planDays,
    generatedFrom: { ...input, version: GENERATOR_VERSION, generatedAt: now },
  };
}

export function dayMinutes(d: PlanDay): number {
  let sec = 0;
  for (const it of d.items) {
    const e = getEx(it.exId);
    if (!e) continue;
    const per = it.seconds ?? Math.round((((it.reps?.[0] ?? 10) + (it.reps?.[1] ?? 10)) / 2) * 3.5);
    sec += it.sets * (per * (e.scheme.perSide ? 2 : 1) + it.rest);
  }
  return Math.round(sec / 60);
}

export function newSeed(): number { return Math.floor(Math.random() * 2 ** 31); }
export const hardDayCount = (p: Plan) => p.days.filter((d) => d.kind === 'workout').length;
