import type { CategoryId, EquipmentId, Exercise, ExerciseKind, Flag, Level, Module, MuscleId, Scheme, StretchType } from '../core/types';

export interface Def {
  id: string;
  pl: string;
  en: string;
  cat: CategoryId;
  module: Module;
  kind: ExerciseKind;
  st?: StretchType;
  p: MuscleId[];
  s?: MuscleId[];
  eq: EquipmentId[];
  lv: Level;
  steps: string[];
  cues: string[];
  err: string[];
  safe?: string[];
  br: string;
  sch: Scheme;
  viz?: string; // wspólny identyfikator ilustracji i animacji (jeśli istnieje animacja)
  alt?: string[];
  tags?: string[];
  loc?: ('gym' | 'home')[];
  flags?: Flag[];
  contra?: string;
  w?: boolean;
  focus?: ('lordosis' | 'scoliosis')[];
  avoid?: ('lordosis' | 'scoliosis')[];
}

const HOME_OK: EquipmentId[] = ['bodyweight', 'mat', 'dumbbells', 'band', 'kettlebell', 'bench', 'pullup_bar', 'step'];
const UNIVERSAL_SAFETY = 'Ostry, kłujący lub nasilający się ból to sygnał do przerwania ćwiczenia — to nie to samo co zwykłe zmęczenie mięśni. Przy bólu lub urazie skonsultuj się z lekarzem lub fizjoterapeutą.';
const STRETCH_SAFETY = 'Rozciągaj do wyraźnego, ale komfortowego napięcia — nigdy do bólu. Nie podskakuj w pozycji statycznej.';

export function ex(d: Def): Exercise {
  const isStretch = d.kind === 'stretch' || d.kind === 'mobility' || d.kind === 'warmup' || d.kind === 'breath';
  const home = d.eq.every((e) => HOME_OK.includes(e));
  const loc = d.loc ?? (d.module === 'gym' ? (home ? ['gym', 'home'] : ['gym']) : ['gym', 'home']);
  const weighted = d.w ?? (d.kind === 'strength' && d.eq.some((e) => ['barbell', 'dumbbells', 'kettlebell', 'machine', 'cable'].includes(e)));
  return {
    id: d.id,
    pl: d.pl,
    en: d.en,
    cat: d.cat,
    module: d.module,
    kind: d.kind,
    stretchType: d.st,
    primary: d.p,
    secondary: d.s ?? [],
    equipment: d.eq,
    level: d.lv,
    steps: d.steps,
    cues: d.cues,
    mistakes: d.err,
    safety: [...(d.safe ?? []), isStretch ? STRETCH_SAFETY : UNIVERSAL_SAFETY],
    breathing: d.br,
    scheme: d.sch,
    illustrationId: d.viz ?? null,
    animationId: d.viz ?? null,
    alt: d.alt ?? [],
    tags: [...new Set([...(d.tags ?? []), ...d.eq, d.module, d.cat])],
    location: loc as ('gym' | 'home')[],
    flags: d.flags,
    contra: d.contra,
    focus: d.focus,
    avoidFor: d.avoid,
    weighted,
  };
}
