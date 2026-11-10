// Wspólne typy domenowe FORM+

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Module = 'gym' | 'home' | 'kettlebell' | 'mobility' | 'posture';
export type Gender = 'female' | 'male' | 'na';
export type Lang = 'pl' | 'en';
export type ThemeMode = 'marble' | 'dark' | 'light' | 'system';
export type PostureFocus = 'lordosis' | 'scoliosis';

export type MuscleId =
  | 'neck' | 'traps' | 'front_delts' | 'side_delts' | 'rear_delts'
  | 'chest' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'lats' | 'mid_back' | 'lower_back'
  | 'glutes' | 'hip_flexors' | 'quads' | 'hamstrings' | 'adductors' | 'calves';

export type EquipmentId =
  | 'bodyweight' | 'mat' | 'dumbbells' | 'band' | 'kettlebell' | 'bench'
  | 'pullup_bar' | 'barbell' | 'rack' | 'machine' | 'cable' | 'step';

export type CategoryId =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'core' | 'glutes'
  | 'quads' | 'hamstrings' | 'calves' | 'fullbody' | 'cardio'
  | 'warmup' | 'stretch' | 'mobility' | 'breathing' | 'posture';

export type ExerciseKind = 'strength' | 'bodyweight' | 'timed' | 'carry' | 'stretch' | 'mobility' | 'warmup' | 'breath' | 'cardio';
export type StretchType = 'dynamic' | 'static' | 'active' | 'pnf' | 'mobilization' | 'activation' | 'breathing';
export type Flag = 'impact' | 'overhead' | 'spinal-load' | 'deep-knee' | 'wrist-load' | 'neck';
export type Limitation = 'knees' | 'back' | 'shoulders' | 'wrists' | 'neck';

export interface Scheme {
  sets: number;
  reps?: [number, number];
  seconds?: number;
  rest: number;
  perSide?: boolean;
}

export interface Exercise {
  id: string;
  pl: string;
  en: string;
  cat: CategoryId;
  module: Module;
  kind: ExerciseKind;
  stretchType?: StretchType;
  primary: MuscleId[];
  secondary: MuscleId[];
  equipment: EquipmentId[];
  level: Level;
  steps: string[];
  cues: string[];
  mistakes: string[];
  safety: string[];
  breathing: string;
  scheme: Scheme;
  illustrationId: string | null;
  animationId: string | null;
  alt: string[];
  tags: string[];
  location: ('gym' | 'home')[];
  flags?: Flag[];
  contra?: string;
  focus?: PostureFocus[]; // dla modułu postawy
  avoidFor?: PostureFocus[]; // ćwiczenie niewskazane przy danym problemie
  weighted?: boolean; // czy rejestrujemy ciężar
}

export interface Profile {
  name: string;
  gender: Gender;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  level: Level;
  goal: GoalId;
  location: 'gym' | 'home' | 'both';
  equipment: EquipmentId[];
  daysPerWeek: number;
  minutes: number;
  intensity: 'low' | 'medium' | 'high';
  limitations: Limitation[];
  createdAt: number;
}

export type GoalId =
  | 'muscle' | 'fatloss' | 'strength' | 'conditioning' | 'fullbody'
  | 'mobility' | 'flexibility' | 'habits';

export interface PlanItem {
  exId: string;
  sets: number;
  reps?: [number, number];
  seconds?: number;
  rest: number;
  weight?: number;
  hold?: number; // utrzymanie pozycji w każdym powtórzeniu (s)
  perSide?: boolean;
  section?: 'warmup' | 'main' | 'cooldown';
}

export type DayKind = 'rest' | 'workout' | 'mobility' | 'recovery';

export interface PlanDay {
  kind: DayKind;
  title: string;
  items: PlanItem[];
}

export interface GeneratorInput {
  goal: GoalId;
  level: Level;
  days: number;
  minutes: number;
  equipment: EquipmentId[];
  location: 'gym' | 'home' | 'both';
  preferred: Module[];
  limitations: Limitation[];
  withWarmup: boolean;
  withCooldown: boolean;
  withMobilityDays: boolean;
  recentExerciseIds: string[];
  seed: number;
}

export interface Plan {
  id: string;
  name: string;
  createdAt: number;
  templateId?: string;
  generatedFrom?: GeneratorInput & { version: number; generatedAt: number };
  days: PlanDay[]; // 7 elementów, 0 = poniedziałek
}

export interface SetLog {
  targetReps?: number;
  targetSeconds?: number;
  reps?: number;
  seconds?: number;
  weight?: number;
  done: boolean;
  skipped?: boolean;
}

export interface WorkoutItem {
  exId: string;
  section?: 'warmup' | 'main' | 'cooldown';
  rest: number;
  hold?: number;
  perSide?: boolean;
  sets: SetLog[];
  skipped?: boolean;
}

export interface WorkoutDraft {
  id: string;
  title: string;
  kind: DayKind | 'custom' | 'quick';
  planId?: string;
  dayIndex?: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  items: WorkoutItem[];
  itemIdx: number;
  setIdx: number;
  restEndsAt: number | null;
  restTotal: number;
  setStartedAt: number;
}

export interface SessionRecord {
  id: string;
  date: string; // YYYY-MM-DD (lokalnie)
  startedAt: number;
  endedAt: number;
  durationSec: number;
  title: string;
  kind: string;
  planId?: string;
  dayIndex?: number;
  items: WorkoutItem[];
  rpe?: number;
  mood?: number;
  notes?: string;
  distanceM?: number;
  prs?: { exId: string; weight: number; reps: number }[];
}

export interface Measurement {
  id: string;
  date: string;
  name: string;
  value: number;
  unit: string;
  note?: string;
}

export interface Settings {
  theme: ThemeMode;
  lang: Lang;
  sound: boolean;
  vibrate: boolean;
  voice: boolean;
  autoRest: boolean;
  defaultRest: number;
  activePlanId: string | null;
  onboarded: boolean;
  posture?: PostureConfig; // starszy zapis — czytany tylko jako zapas dla sekcji „Kręgosłup”
  builders?: Partial<Record<SectionId, BuilderState>>;
  savedSets?: SavedSet[];
}

export type SectionId = 'spine' | 'stretch';
export interface BuilderState { filter: string; cfg: Record<string, PostureExCfg> }
export interface SavedSet { id: string; name: string; section: SectionId; items: { id: string; cfg: PostureExCfg }[] }

export interface PostureExCfg { on: boolean; sets: number; mode: 'reps' | 'time'; reps: number; hold: number; seconds: number; rest: number }
export interface PostureConfig { focus: PostureFocus | 'all'; cfg: Record<string, PostureExCfg> }

export interface BackupFile {
  app: 'formplus';
  version: 1;
  exportedAt: number;
  profile: Profile | null;
  settings: Settings;
  plans: Plan[];
  sessions: SessionRecord[];
  measurements: Measurement[];
}
