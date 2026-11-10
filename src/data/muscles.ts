import type { CategoryId, EquipmentId, GoalId, Level, MuscleId, Module } from '../core/types';

export interface MuscleInfo {
  id: MuscleId;
  pl: string;
  en: string;
  detailPl: string; // anatomia w skrócie
  views: ('front' | 'back')[];
  lower: boolean; // część dolna sylwetki (do dopasowania sylwetki)
}

export const MUSCLES: Record<MuscleId, MuscleInfo> = {
  neck: { id: 'neck', pl: 'Szyja', en: 'Neck', detailPl: 'Mięśnie mostkowo-obojczykowo-sutkowe, dźwigacz łopatki, mięśnie podpotyliczne.', views: ['front', 'back'], lower: false },
  traps: { id: 'traps', pl: 'Czworoboczne (kaptury)', en: 'Trapezius', detailPl: 'Mięsień czworoboczny grzbietu: część zstępująca, poprzeczna i wstępująca.', views: ['front', 'back'], lower: false },
  front_delts: { id: 'front_delts', pl: 'Barki — przód', en: 'Front delts', detailPl: 'Przedni akton mięśnia naramiennego; unosi ramię do przodu.', views: ['front'], lower: false },
  side_delts: { id: 'side_delts', pl: 'Barki — bok', en: 'Side delts', detailPl: 'Środkowy akton mięśnia naramiennego; odwodzi ramię w bok.', views: ['front', 'back'], lower: false },
  rear_delts: { id: 'rear_delts', pl: 'Barki — tył', en: 'Rear delts', detailPl: 'Tylny akton mięśnia naramiennego; odwodzi ramię do tyłu.', views: ['back'], lower: false },
  chest: { id: 'chest', pl: 'Klatka piersiowa', en: 'Chest', detailPl: 'Mięsień piersiowy większy i mniejszy.', views: ['front'], lower: false },
  biceps: { id: 'biceps', pl: 'Biceps', en: 'Biceps', detailPl: 'Mięsień dwugłowy ramienia; zgina łokieć i supinuje przedramię.', views: ['front'], lower: false },
  triceps: { id: 'triceps', pl: 'Triceps', en: 'Triceps', detailPl: 'Mięsień trójgłowy ramienia; prostuje łokieć.', views: ['back'], lower: false },
  forearms: { id: 'forearms', pl: 'Przedramiona', en: 'Forearms', detailPl: 'Zginacze i prostowniki nadgarstka oraz palców (siła chwytu).', views: ['front', 'back'], lower: false },
  abs: { id: 'abs', pl: 'Brzuch (prosty i poprzeczny)', en: 'Abs / transverse abdominis', detailPl: 'Mięsień prosty brzucha oraz głęboki mięsień poprzeczny stabilizujący tułów.', views: ['front'], lower: false },
  obliques: { id: 'obliques', pl: 'Mięśnie skośne brzucha', en: 'Obliques', detailPl: 'Skośne zewnętrzne i wewnętrzne; rotacja i zginanie boczne tułowia.', views: ['front'], lower: false },
  lats: { id: 'lats', pl: 'Najszerszy grzbietu', en: 'Lats', detailPl: 'Mięsień najszerszy grzbietu; przywodzi i prostuje ramię.', views: ['back'], lower: false },
  mid_back: { id: 'mid_back', pl: 'Środek pleców (równoległoboczne)', en: 'Mid back / rhomboids', detailPl: 'Mięśnie równoległoboczne i obły większy; ściągają łopatki.', views: ['back'], lower: false },
  lower_back: { id: 'lower_back', pl: 'Prostowniki grzbietu (lędźwie)', en: 'Erector spinae', detailPl: 'Prostownik grzbietu; prostuje kręgosłup i utrzymuje postawę.', views: ['back'], lower: true },
  glutes: { id: 'glutes', pl: 'Pośladki', en: 'Glutes', detailPl: 'Pośladkowy wielki, średni i mały; prostowanie i odwodzenie biodra.', views: ['back'], lower: true },
  hip_flexors: { id: 'hip_flexors', pl: 'Zginacze biodra', en: 'Hip flexors', detailPl: 'Mięsień biodrowo-lędźwiowy i prosty uda; unoszą nogę do przodu.', views: ['front'], lower: true },
  quads: { id: 'quads', pl: 'Czworogłowe uda', en: 'Quadriceps', detailPl: 'Cztery głowy; prostują kolano, jedna z nich zgina biodro.', views: ['front'], lower: true },
  hamstrings: { id: 'hamstrings', pl: 'Dwugłowe uda', en: 'Hamstrings', detailPl: 'Grupa kulszowo-goleniowa; zgina kolano i prostuje biodro.', views: ['back'], lower: true },
  adductors: { id: 'adductors', pl: 'Przywodziciele (wewnętrzna strona uda)', en: 'Adductors', detailPl: 'Przywodzą udo i stabilizują miednicę.', views: ['front'], lower: true },
  calves: { id: 'calves', pl: 'Łydki', en: 'Calves', detailPl: 'Brzuchaty łydki i płaszczkowaty; prostują stopę (palce w dół).', views: ['front', 'back'], lower: true },
};

export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[];

export const EQUIPMENT: { id: EquipmentId; pl: string; en: string; home: boolean }[] = [
  { id: 'bodyweight', pl: 'Masa własnego ciała', en: 'Bodyweight', home: true },
  { id: 'mat', pl: 'Mata', en: 'Mat', home: true },
  { id: 'dumbbells', pl: 'Hantle', en: 'Dumbbells', home: true },
  { id: 'band', pl: 'Gumy oporowe', en: 'Resistance bands', home: true },
  { id: 'kettlebell', pl: 'Kettlebell', en: 'Kettlebell', home: true },
  { id: 'bench', pl: 'Ławka', en: 'Bench', home: true },
  { id: 'pullup_bar', pl: 'Drążek', en: 'Pull-up bar', home: true },
  { id: 'step', pl: 'Stopień / podest', en: 'Step / box', home: true },
  { id: 'barbell', pl: 'Sztanga', en: 'Barbell', home: false },
  { id: 'rack', pl: 'Stojaki / klatka', en: 'Rack', home: false },
  { id: 'machine', pl: 'Maszyny', en: 'Machines', home: false },
  { id: 'cable', pl: 'Wyciągi', en: 'Cables', home: false },
];

export const GYM_EQUIPMENT: EquipmentId[] = EQUIPMENT.map((e) => e.id);
export const HOME_BASIC: EquipmentId[] = ['bodyweight', 'mat'];

export const CATEGORIES: { id: CategoryId; pl: string; en: string }[] = [
  { id: 'chest', pl: 'Klatka piersiowa', en: 'Chest' },
  { id: 'back', pl: 'Plecy', en: 'Back' },
  { id: 'shoulders', pl: 'Barki', en: 'Shoulders' },
  { id: 'biceps', pl: 'Biceps', en: 'Biceps' },
  { id: 'triceps', pl: 'Triceps', en: 'Triceps' },
  { id: 'core', pl: 'Brzuch i mięśnie głębokie', en: 'Core' },
  { id: 'glutes', pl: 'Pośladki', en: 'Glutes' },
  { id: 'quads', pl: 'Czworogłowe uda', en: 'Quads' },
  { id: 'hamstrings', pl: 'Dwugłowe uda', en: 'Hamstrings' },
  { id: 'calves', pl: 'Łydki', en: 'Calves' },
  { id: 'fullbody', pl: 'Całe ciało', en: 'Full body' },
  { id: 'cardio', pl: 'Kondycja', en: 'Conditioning' },
  { id: 'warmup', pl: 'Rozgrzewka', en: 'Warm-up' },
  { id: 'stretch', pl: 'Rozciąganie', en: 'Stretching' },
  { id: 'mobility', pl: 'Mobilność', en: 'Mobility' },
  { id: 'breathing', pl: 'Oddech i wyciszenie', en: 'Breathing' },
  { id: 'posture', pl: 'Postawa i kręgosłup', en: 'Posture & spine' },
];

export const MODULES: { id: Module; pl: string; en: string }[] = [
  { id: 'gym', pl: 'Siłownia', en: 'Gym' },
  { id: 'home', pl: 'Dom', en: 'Home' },
  { id: 'kettlebell', pl: 'Kettlebell', en: 'Kettlebell' },
  { id: 'mobility', pl: 'Stretching i mobilność', en: 'Stretch & mobility' },
  { id: 'posture', pl: 'Postawa i kręgosłup', en: 'Posture & spine' },
];

export const LEVELS: { id: Level; pl: string; en: string }[] = [
  { id: 'beginner', pl: 'Początkujący', en: 'Beginner' },
  { id: 'intermediate', pl: 'Średniozaawansowany', en: 'Intermediate' },
  { id: 'advanced', pl: 'Zaawansowany', en: 'Advanced' },
];

export const GOALS: { id: GoalId; pl: string; en: string }[] = [
  { id: 'muscle', pl: 'Budowa masy mięśniowej', en: 'Build muscle' },
  { id: 'fatloss', pl: 'Redukcja tkanki tłuszczowej', en: 'Fat loss' },
  { id: 'strength', pl: 'Poprawa siły', en: 'Get stronger' },
  { id: 'conditioning', pl: 'Poprawa kondycji', en: 'Conditioning' },
  { id: 'fullbody', pl: 'Wzmocnienie całego ciała', en: 'Full-body strength' },
  { id: 'mobility', pl: 'Zwiększenie mobilności', en: 'Mobility' },
  { id: 'flexibility', pl: 'Poprawa elastyczności', en: 'Flexibility' },
  { id: 'habits', pl: 'Zdrowe nawyki i regularny ruch', en: 'Healthy habits' },
];

export const DAY_NAMES_PL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
export const DAY_SHORT_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
