import type { EquipmentId, Gender, Level, Limitation, Plan, PlanDay, PlanItem } from '../core/types';
import { uid } from '../core/time';
import { getEx } from './exercises';
import { ROUTINE_BY_ID } from './routines';
import { adaptItems, decorate, itemFor, routineItems } from '../engine/generator';

type DT = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';
type Spec = { title: string; type: DT; ids: string[]; goal?: 'strength' | 'muscle' | 'conditioning' | 'fullbody' };
type Cell = Spec | { routine: string } | null;

export interface Template {
  id: string;
  pl: string;
  en: string;
  desc: string;
  days: number;
  place: 'gym' | 'home' | 'both';
  week: Cell[]; // 7 komórek: pn..nd
}

const FB_A: Spec = { title: 'Całe ciało A', type: 'full', ids: ['gym-back-squat', 'gym-db-bench-press', 'gym-seated-cable-row', 'gym-db-shoulder-press', 'gym-rdl', 'home-plank'] };
const FB_B: Spec = { title: 'Całe ciało B', type: 'full', ids: ['gym-leg-press', 'gym-incline-db-press', 'gym-lat-pulldown', 'gym-lateral-raise', 'home-glute-bridge', 'home-dead-bug'] };
const FB_C: Spec = { title: 'Całe ciało C', type: 'full', ids: ['gym-db-lunge', 'gym-chest-press-machine', 'gym-one-arm-db-row', 'gym-hip-thrust', 'gym-hammer-curl', 'gym-triceps-pushdown'] };

export const TEMPLATES: Template[] = [
  { id: 't-fullbody', pl: 'Full Body Workout', en: 'Full body workout', desc: '3 dni w tygodniu, całe ciało na każdej sesji. Dobry start i regularna siła.', days: 3, place: 'gym', week: [FB_A, null, FB_B, null, FB_C, null, null] },
  { id: 't-upperlower', pl: 'Upper/Lower', en: 'Upper/Lower', desc: '4 dni: góra i dół ciała na przemian, częstotliwość 2× na partię.', days: 4, place: 'gym', week: [
    { title: 'Góra ciała A', type: 'upper', ids: ['gym-bench-press', 'gym-barbell-row', 'gym-db-shoulder-press', 'gym-lat-pulldown', 'gym-barbell-curl', 'gym-triceps-pushdown'] },
    { title: 'Dół ciała A', type: 'lower', ids: ['gym-back-squat', 'gym-rdl', 'gym-db-lunge', 'gym-leg-curl', 'gym-calf-raise', 'gym-cable-crunch'] },
    null,
    { title: 'Góra ciała B', type: 'upper', ids: ['gym-incline-db-press', 'gym-seated-cable-row', 'gym-overhead-press', 'gym-pullup', 'gym-lateral-raise', 'gym-hammer-curl'] },
    { title: 'Dół ciała B', type: 'lower', ids: ['gym-leg-press', 'gym-hip-thrust', 'gym-bulgarian-split-squat', 'gym-leg-extension', 'gym-calf-raise', 'gym-hanging-knee-raise'] },
    null, null,
  ] },
  { id: 't-ppl', pl: 'Push/Pull/Legs', en: 'Push/Pull/Legs', desc: '6 dni: pchanie, ciągnięcie, nogi — dla zaawansowanych i dobrze regenerujących się osób.', days: 6, place: 'gym', week: [
    { title: 'Push', type: 'push', ids: ['gym-bench-press', 'gym-overhead-press', 'gym-incline-db-press', 'gym-lateral-raise', 'gym-triceps-pushdown', 'gym-overhead-triceps-ext'] },
    { title: 'Pull', type: 'pull', ids: ['gym-barbell-row', 'gym-lat-pulldown', 'gym-seated-cable-row', 'gym-face-pull', 'gym-barbell-curl', 'gym-hammer-curl'] },
    { title: 'Legs', type: 'legs', ids: ['gym-back-squat', 'gym-rdl', 'gym-leg-press', 'gym-leg-curl', 'gym-calf-raise', 'gym-cable-crunch'] },
    { title: 'Push', type: 'push', ids: ['gym-db-bench-press', 'gym-db-shoulder-press', 'gym-cable-fly', 'gym-lateral-raise', 'gym-triceps-pushdown', 'gym-overhead-triceps-ext'] },
    { title: 'Pull', type: 'pull', ids: ['gym-pullup', 'gym-one-arm-db-row', 'gym-seated-cable-row', 'gym-rear-delt-fly', 'gym-hammer-curl', 'gym-barbell-curl'] },
    { title: 'Legs', type: 'legs', ids: ['gym-deadlift', 'gym-bulgarian-split-squat', 'gym-leg-extension', 'gym-hip-thrust', 'gym-calf-raise', 'gym-hanging-knee-raise'] }, null,
  ] },
  { id: 't-home', pl: 'Trening domowy', en: 'Home workout', desc: '3 dni: masa własnego ciała, guma i hantle. Bez skakania.', days: 3, place: 'home', week: [
    { title: 'Dom: całe ciało A', type: 'full', ids: ['home-bw-squat', 'home-pushup', 'home-band-row', 'home-glute-bridge', 'home-plank'] },
    { routine: 'r-daily-10' },
    { title: 'Dom: całe ciało B', type: 'full', ids: ['home-reverse-lunge', 'home-incline-pushup', 'home-good-morning', 'home-db-floor-press', 'home-dead-bug', 'home-calf-raise'] }, null,
    { title: 'Dom: całe ciało C', type: 'full', ids: ['home-step-up', 'home-pushup', 'home-bird-dog', 'home-band-pull-apart', 'home-side-plank', 'home-mountain-climber'] },
    { routine: 'r-relax-20' }, null,
  ] },
  { id: 't-kettlebell', pl: 'Kettlebell', en: 'Kettlebell', desc: '3 dni z odważnikiem: siła, moc i całe ciało. Zaawansowane ruchy są zastępowane łatwiejszymi, jeśli ustawiony poziom jest niższy.', days: 3, place: 'both', week: [
    { title: 'KB: siła', type: 'full', goal: 'strength', ids: ['kb-deadlift', 'kb-goblet-squat', 'kb-press', 'kb-row', 'kb-farmer-carry'] }, null,
    { title: 'KB: moc i kondycja', type: 'full', goal: 'conditioning', ids: ['kb-swing', 'kb-clean', 'kb-push-press', 'kb-lunge', 'kb-suitcase-carry'] }, null,
    { title: 'KB: całe ciało', type: 'full', goal: 'fullbody', ids: ['kb-turkish-getup', 'kb-halo', 'kb-floor-press', 'kb-snatch', 'kb-windmill', 'kb-goblet-squat'] },
    { routine: 'r-relax-20' }, null,
  ] },
  { id: 't-mixed', pl: 'Trening mieszany (przykładowy 4-dniowy)', en: 'Mixed week', desc: 'Pn góra, Wt mobilność, Śr dół, Pt kettlebell, So stretching.', days: 4, place: 'both', week: [
    { title: 'Góra ciała', type: 'upper', ids: ['gym-bench-press', 'gym-barbell-row', 'gym-db-shoulder-press', 'gym-lat-pulldown', 'gym-barbell-curl', 'gym-triceps-pushdown'] },
    { routine: 'r-daily-10' },
    { title: 'Dół ciała', type: 'lower', ids: ['gym-back-squat', 'gym-rdl', 'gym-db-lunge', 'gym-leg-curl', 'gym-calf-raise', 'home-plank'] }, null,
    { title: 'Kettlebell / całe ciało', type: 'full', goal: 'fullbody', ids: ['kb-swing', 'kb-goblet-squat', 'kb-press', 'kb-row', 'kb-farmer-carry'] },
    { routine: 'r-relax-20' }, null,
  ] },
  { id: 't-mobility', pl: 'Stretching i mobilność', en: 'Stretching & mobility', desc: '5 krótkich sesji w tygodniu — mobilność, rozciąganie i wyciszenie.', days: 5, place: 'both', week: [
    { routine: 'r-morning' }, { routine: 'r-hips' }, { routine: 'r-spine-mob' }, { routine: 'r-shoulder-mob' }, { routine: 'r-after-sitting' }, { routine: 'r-relax-20' }, null,
  ] },
];

export const TEMPLATE_BY_ID: Record<string, Template> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

export interface BuildOpts { gender: Gender; level: Level; equipment: EquipmentId[]; limitations: Limitation[]; withWarmup?: boolean; withCooldown?: boolean }

/** Różnice w akcentach (nie ograniczają ćwiczeń): kobiety — więcej pośladków; mężczyźni — więcej barków/ramion. */
function emphasisExtras(type: DT, gender: Gender, home: boolean): string[] {
  if (gender === 'female' && (type === 'lower' || type === 'legs' || type === 'full')) return [home ? 'home-glute-bridge' : 'gym-hip-thrust'];
  if (gender === 'male' && (type === 'upper' || type === 'push')) return ['gym-lateral-raise'];
  if (gender === 'male' && type === 'pull') return ['gym-hammer-curl'];
  return [];
}

export function buildTemplatePlan(id: string, o: BuildOpts, now = Date.now()): Plan {
  const t = TEMPLATE_BY_ID[id];
  const days: PlanDay[] = t.week.map((cell) => {
    if (!cell) return { kind: 'rest', title: 'Odpoczynek', items: [] };
    if ('routine' in cell) { const r = ROUTINE_BY_ID[cell.routine]; return { kind: 'mobility', title: r.pl, items: routineItems(r, { level: o.level, equipment: o.equipment, limitations: o.limitations }) }; }
    const ids = [...cell.ids];
    const home = t.place === 'home';
    for (const x of emphasisExtras(cell.type, o.gender, home)) if (!ids.includes(x) && getEx(x)) ids.push(x);
    const goal = cell.goal ?? 'muscle';
    const raw: PlanItem[] = ids.map((x) => itemFor(getEx(x)!, goal === 'fullbody' ? 'fullbody' : goal, o.level));
    const adapted = adaptItems(raw, o.level, o.equipment, o.limitations);
    return { kind: 'workout', title: cell.title, items: decorate(cell.type, adapted, o.withWarmup ?? true, o.withCooldown ?? true, o.level, o.equipment) };
  });
  return { id: uid('plan'), name: t.pl, createdAt: now, templateId: id, days };
}
