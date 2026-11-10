// Biblioteka póz (widok z boku, postać zwrócona w prawo). Każda animacja = klatki kluczowe,
// a ruch pomiędzy nimi jest interpolowany i rozwiązywany IK (patrz engine/figure.ts).
// To ilustracje poglądowe — nie zastępują instruktażu trenera.

import { A, S, type Anim, type Frame, type PoseSpec, type V2 } from '../engine/figure';

const F = (label: string, pose: PoseSpec): Frame => ({ label, pose });
const GY = 172; // wysokość kostki stojącej postaci
const STAND_HIP: V2 = [120, 100];
const stand = (hand = S(0, 51), extra: Partial<PoseSpec> = {}): PoseSpec => ({ hip: STAND_HIP, torso: 0, head: 0, hand, foot: [120, GY], ...extra });

const A_: Record<string, Anim> = {};
const add = (a: Anim) => { A_[a.id] = a; };
const variant = (base: string, id: string, patch: Partial<Anim>) => add({ ...A_[base], ...patch, id });

// ——— PRZYSIADY ———
add({ id: 'squat_bw', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', frames: [
  F('Start', stand(S(46, 2), { head: 0 })),
  F('Dół', { hip: [103, 134], torso: 36, head: 18, hand: S(46, 2), foot: [120, GY] }),
] });
add({ id: 'goblet_squat', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'hang' }, trace: true, frames: [
  F('Start', stand(S(15, 12))),
  F('Dół', { hip: [103, 134], torso: 28, head: 10, hand: S(15, 12), foot: [120, GY] }),
] });
add({ id: 'squat_back', loop: 'pingpong', ms: 1300, elbow: 'down', knee: 'front', impl: { type: 'barbell', at: 'shoulder', off: [-4, -2] }, trace: true, frames: [
  F('Start', stand(S(-3, -6), { torso: 4 })),
  F('Dół', { hip: [100, 134], torso: 44, head: 26, hand: S(-3, -6), foot: [120, GY] }),
] });

// ——— ZAWIAS BIODROWY / MARTWY CIĄG ———
add({ id: 'deadlift_barbell', loop: 'pingpong', ms: 1300, elbow: 'down', knee: 'front', impl: { type: 'barbell' }, trace: true, frames: [
  F('Start', { hip: [95, 127], torso: 62, head: 38, hand: S(0, 51), foot: [120, GY] }),
  F('Wyprost', stand(S(0, 51), { torso: -2 })),
] });
add({ id: 'rdl_barbell', loop: 'pingpong', ms: 1400, elbow: 'down', knee: 'front', impl: { type: 'barbell' }, trace: true, frames: [
  F('Start', stand(S(0, 51), { torso: -2 })),
  F('Dół', { hip: [86, 110], torso: 66, head: 40, hand: S(0, 51), foot: [120, GY] }),
] });
add({ id: 'hinge_bw', loop: 'pingpong', ms: 1300, elbow: 'down', knee: 'front', frames: [
  F('Start', stand(S(12, 10))),
  F('Dół', { hip: [86, 110], torso: 66, head: 40, hand: S(12, 10), foot: [120, GY] }),
] });
add({ id: 'kb_deadlift', loop: 'pingpong', ms: 1300, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'hang' }, trace: true, frames: [
  F('Start', { hip: [95, 127], torso: 62, head: 38, hand: A(128, 150), foot: [120, GY] }),
  F('Wyprost', stand(S(0, 51), { torso: -2 })),
] });

// ——— KETTLEBELL: SWING / CLEAN / SNATCH ———
add({ id: 'kb_swing', loop: 'pingpong', ms: 750, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'forearm' }, trace: true, frames: [
  F('Za nogami', { hip: [96, 118], torso: 55, head: 30, hand: A(112, 140), foot: [120, GY] }),
  F('Szczyt', stand(S(51, 2), { torso: -2 })),
] });
add({ id: 'kb_clean', loop: 'pingpong', ms: 800, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'rear' }, trace: true, frames: [
  F('Start', { hip: [96, 118], torso: 55, head: 30, hand: A(112, 140), foot: [120, GY] }),
  F('Rack', stand(S(10, -8), { torso: -2 })),
] });
add({ id: 'kb_snatch', loop: 'pingpong', ms: 800, elbow: 'up', knee: 'front', impl: { type: 'kettlebell', mode: 'rear' }, trace: true, frames: [
  F('Start', { hip: [96, 118], torso: 55, head: 30, hand: A(112, 140), foot: [120, GY] }),
  F('Przyciągnięcie', { hip: [118, 102], torso: 6, head: 4, hand: S(22, -22), foot: [120, GY] }),
  F('Góra', stand(S(2, -51), { torso: 0 })),
] });

// ——— WYCISKANIE NAD GŁOWĘ ———
add({ id: 'ohp_barbell', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', impl: { type: 'barbell' }, trace: true, frames: [
  F('Start', stand(S(10, -8))),
  F('Wyprost', stand(S(3, -51), { torso: -3, head: -5 })),
] });
add({ id: 'ohp_db', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', impl: { type: 'dumbbell' }, trace: true, frames: [
  F('Start', stand(S(6, -10))),
  F('Wyprost', stand(S(3, -51), { torso: -2 })),
] });
add({ id: 'kb_press', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'rear' }, trace: true, frames: [
  F('Rack', stand(S(9, -8))),
  F('Wyprost', stand(S(3, -51), { torso: -2 })),
] });
add({ id: 'kb_push_press', loop: 'pingpong', ms: 750, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'rear' }, trace: true, frames: [
  F('Rack', stand(S(9, -8))),
  F('Dip', { hip: [120, 112], torso: 0, head: 0, hand: S(9, -8), foot: [120, GY] }),
  F('Wyprost', stand(S(3, -51), { torso: -2 })),
] });

// ——— WYKROKI ———
const lungeBottom = (hand: ReturnType<typeof S>): PoseSpec => ({ hip: [112, 135], torso: 2, head: 0, hand, foot: [140, GY], footFar: [82, 164] });
const lungeStart = (hand: ReturnType<typeof S>): PoseSpec => ({ hip: STAND_HIP, torso: 0, head: 0, hand, foot: [118, GY], footFar: [112, GY] });
add({ id: 'lunge_bw', loop: 'pingpong', ms: 1100, elbow: 'back', knee: 'front', frames: [F('Start', lungeStart(S(12, 8))), F('Dół', lungeBottom(S(12, 8)))] });
add({ id: 'lunge_db', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', impl: { type: 'dumbbell' }, trace: false, frames: [F('Start', lungeStart(S(0, 51))), F('Dół', lungeBottom(S(0, 51)))] });
add({ id: 'lunge_kb', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'hang' }, frames: [F('Start', lungeStart(S(15, 12))), F('Dół', lungeBottom(S(15, 12)))] });

// ——— PODPÓR: POMPKI, PLANK, MOUNTAIN CLIMBER, GĄSIENICA ———
const plankTop: PoseSpec = { hip: [112, 141], torso: 65, head: 72, hand: A(155, 172), foot: [45, 165], toe: 15 };
add({ id: 'pushup', loop: 'pingpong', ms: 1000, elbow: 'back', knee: 'front', frames: [
  F('Góra', plankTop),
  F('Dół', { hip: [117, 156], torso: 78, head: 82, hand: A(155, 172), foot: [45, 165], toe: 15 }),
] });
add({ id: 'plank', loop: 'static', ms: 1000, elbow: 'down', knee: 'front', env: [{ t: 'mat', x: 20, y: GROUND_Y(), w: 220 }], frames: [
  F('Pozycja', { hip: [114, 153], torso: 80, head: 84, hand: A(186, 171), foot: [45, 165], toe: 15 }),
] });
add({ id: 'mountain_climber', loop: 'pingpong', ms: 450, elbow: 'back', knee: 'front', frames: [
  F('Kolano 1', { ...plankTop, foot: [95, 148], footFar: [45, 165] }),
  F('Kolano 2', { ...plankTop, foot: [45, 165], footFar: [95, 148] }),
] });
add({ id: 'inchworm', loop: 'pingpong', ms: 1400, elbow: 'back', knee: 'front', frames: [
  F('Skłon', { hip: [52, 100], torso: 118, head: 130, hand: A(96, 172), foot: [60, GY], toe: 90 }),
  F('Podpór', { hip: [127, 141], torso: 65, head: 72, hand: A(170, 172), foot: [60, 165], toe: 15 }),
] });

// ——— LEŻENIE: WYCISKANIE, MOSTEK, HIP THRUST, DEAD BUG ———
const benchEnv = [{ t: 'bench' as const, x: 52, y: 130, w: 130, h: 8 }];
const lying = (hand: ReturnType<typeof S>, hipY = 121): PoseSpec => ({ hip: [140, hipY], torso: -90, head: -92, hand, foot: [182, GY] });
add({ id: 'bench_press', loop: 'pingpong', ms: 1200, elbow: 'down', knee: 'up', impl: { type: 'barbell' }, env: benchEnv, trace: true, frames: [
  F('Start', lying(S(0, -51))), F('Dół', lying(S(2, -17))),
] });
add({ id: 'bench_press_db', loop: 'pingpong', ms: 1200, elbow: 'down', knee: 'up', impl: { type: 'dumbbell' }, env: benchEnv, trace: true, frames: [
  F('Start', lying(S(0, -51))), F('Dół', lying(S(6, -22))),
] });
const floorEnv = [{ t: 'mat' as const, x: 30, y: 176, w: 200 }];
add({ id: 'floor_press_db', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'up', impl: { type: 'dumbbell' }, env: floorEnv, trace: true, frames: [
  F('Start', lying(S(0, -51), 166)), F('Dół', lying(S(10, -24), 166)),
] });
add({ id: 'floor_press_kb', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'up', impl: { type: 'kettlebell', mode: 'rear' }, env: floorEnv, trace: true, frames: [
  F('Start', lying(S(0, -51), 166)), F('Dół', lying(S(10, -24), 166)),
] });
add({ id: 'glute_bridge', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'up', env: floorEnv, frames: [
  F('Start', { hip: [140, 167], torso: -90, head: -90, hand: S(48, 4), foot: [172, GY] }),
  F('Góra', { hip: [134, 143], torso: -120, head: -92, hand: S(48, 6), foot: [172, GY] }),
] });
add({ id: 'hip_thrust', loop: 'pingpong', ms: 1100, elbow: 'down', knee: 'front', impl: { type: 'barbell', at: 'hip', off: [0, -8] }, env: [{ t: 'bench', x: 44, y: 130, w: 56, h: 8 }], trace: true, frames: [
  F('Start', { hip: [124, 156], torso: -43, head: -30, hand: S(40, 24), foot: [166, GY] }),
  F('Góra', { hip: [138, 113], torso: -100, head: -60, hand: S(40, 40), foot: [166, GY] }),
] });
add({ id: 'dead_bug', loop: 'pingpong', ms: 1200, elbow: 'down', knee: 'up', env: floorEnv, frames: [
  F('Start', { hip: [140, 166], torso: -90, head: -90, hand: S(0, -51), handFar: S(0, -51), foot: [177, 128], footFar: [177, 128] }),
  F('Rozprost', { hip: [140, 166], torso: -90, head: -90, hand: S(-51, 2), handFar: S(0, -51), foot: [177, 128], footFar: [208, 168] }),
] });

// ——— KLĘK PODPARTY ———
const quad: PoseSpec = { hip: [82, 121], torso: 90, head: 80, hand: A(130, 172), foot: [46, 170] };
add({ id: 'bird_dog', loop: 'pingpong', ms: 1200, elbow: 'down', knee: 'down', env: floorEnv, frames: [
  F('Start', { ...quad, handFar: A(126, 172), footFar: [46, 170] }),
  F('Wyprost', { ...quad, hand: A(190, 121), handFar: A(126, 172), foot: [46, 170], footFar: [10, 121], head: 86 }),
] });
add({ id: 'cat_cow', loop: 'pingpong', ms: 1500, elbow: 'down', knee: 'down', env: floorEnv, frames: [
  F('Krowa', { ...quad, torso: 94, head: 58, arch: -10 }),
  F('Kot', { ...quad, torso: 86, head: 118, arch: 14 }),
] });

// ——— WIOSŁOWANIE / PODCIĄGANIE / UGINANIE ———
const rowStart: PoseSpec = { hip: [88, 112], torso: 62, head: 40, hand: S(0, 51), foot: [120, GY] };
add({ id: 'row_barbell', loop: 'pingpong', ms: 1000, elbow: 'back', knee: 'front', impl: { type: 'barbell' }, trace: true, frames: [
  F('Start', rowStart), F('Przyciągnięcie', { ...rowStart, hand: A(110, 118) }),
] });
add({ id: 'kb_row', loop: 'pingpong', ms: 1000, elbow: 'back', knee: 'front', impl: { type: 'kettlebell', mode: 'hang' }, trace: true, frames: [
  F('Start', rowStart), F('Przyciągnięcie', { ...rowStart, hand: A(112, 112) }),
] });
add({ id: 'pullup', loop: 'pingpong', ms: 1400, elbow: 'down', knee: 'front', env: [{ t: 'bar', x: 100, y: -8, w: 60 }], frames: [
  F('Zwis', { hip: [130, 91], torso: 0, head: 0, hand: A(138, -8), foot: [128, 163], footFar: [120, 163] }),
  F('Góra', { hip: [130, 49], torso: -4, head: -12, hand: A(138, -8), foot: [128, 121], footFar: [120, 121] }),
] });
const curlFrames = (impl: Anim['impl']): Anim => ({ id: '', loop: 'pingpong', ms: 1000, elbow: 'down', knee: 'front', impl, trace: true, frames: [
  F('Start', stand(S(4, 50))), F('Góra', stand(S(20, 8))),
] });
add({ ...curlFrames({ type: 'barbell' }), id: 'curl_barbell' });

// ——— CHODZENIE Z CIĘŻAREM ———
add({ id: 'carry_farmer', loop: 'pingpong', ms: 600, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', mode: 'hang' }, frames: [
  F('Krok 1', { ...stand(S(0, 51)), foot: [108, GY], footFar: [134, GY] }),
  F('Krok 2', { ...stand(S(0, 51)), foot: [134, GY], footFar: [108, GY] }),
] });
variant('carry_farmer', 'carry_suitcase', { frames: [
  F('Krok 1', { ...stand(S(0, 51), { handFar: S(-3, 47) }), foot: [108, GY], footFar: [134, GY] }),
  F('Krok 2', { ...stand(S(0, 51), { handFar: S(-3, 47) }), foot: [134, GY], footFar: [108, GY] }),
] });

// ——— HALO ———
add({ id: 'kb_halo', loop: 'pingpong', ms: 1200, elbow: 'down', knee: 'front', impl: { type: 'kettlebell', off: [0, -12] }, trace: true, frames: [
  F('Przed twarzą', stand(S(17, -17))),
  F('Za głową', stand(S(-17, -17))),
] });

// ——— MOBILNOŚĆ ———
add({ id: 'leg_swing', loop: 'pingpong', ms: 800, elbow: 'back', knee: 'front', env: [{ t: 'wall', x: 176, y: 0 }], frames: [
  F('Noga do przodu', { hip: STAND_HIP, torso: 0, head: 0, hand: A(174, 70), foot: [161, 159], footFar: [118, GY] }),
  F('Noga do tyłu', { hip: STAND_HIP, torso: 0, head: 0, hand: A(174, 70), foot: [79, 159], footFar: [118, GY] }),
] });
add({ id: 'ankle_rock', loop: 'pingpong', ms: 1100, elbow: 'back', knee: 'front', env: [{ t: 'wall', x: 190, y: 0 }], frames: [
  F('Start', { hip: [122, 100], torso: 4, head: 4, hand: A(188, 62), foot: [124, GY], footFar: [118, GY] }),
  F('Kolano do ściany', { hip: [150, 108], torso: 18, head: 20, hand: A(188, 62), foot: [124, GY], footFar: [118, GY] }),
] });
add({ id: 'hamstring_supine', loop: 'static', ms: 1000, elbow: 'down', knee: 'up', impl: { type: 'strap' }, env: floorEnv, frames: [
  F('Pozycja', { hip: [140, 167], torso: -90, head: -88, hand: A(122, 118), foot: [152, 96], footFar: [212, 170] }),
] });
add({ id: 'quad_stretch', loop: 'static', ms: 1000, elbow: 'back', knee: 'down', frames: [
  F('Pozycja', { hip: STAND_HIP, torso: 0, head: 0, hand: S(2, 40), handFar: A(110, 100), foot: [120, GY], footFar: [110, 100] }),
] });
add({ id: 'hip_flexor', loop: 'static', ms: 1000, elbow: 'back', knee: 'front', env: floorEnv, frames: [
  F('Pozycja', { hip: [118, 130], torso: 0, head: 0, hand: A(142, 126), foot: [150, GY], footFar: [58, 168] }),
] });
add({ id: 'childs_pose', loop: 'static', ms: 1000, elbow: 'down', knee: 'front', env: floorEnv, frames: [
  F('Pozycja', { hip: [80, 148], torso: 100, head: 115, hand: A(186, 172), foot: [60, 170], toe: 90 }),
] });
add({ id: 'chest_doorway', loop: 'static', ms: 1000, elbow: 'back', knee: 'front', env: [{ t: 'wall', x: 94, y: 0 }], frames: [
  F('Pozycja', stand(A(96, 29), { torso: 0 })),
] });
add({ id: 'calf_wall', loop: 'static', ms: 1000, elbow: 'down', knee: 'front', env: [{ t: 'wall', x: 176, y: 0 }], frames: [
  F('Pozycja', { hip: [122, 106], torso: 20, head: 20, hand: A(174, 70), foot: [88, GY], footFar: [150, GY] }),
] });

// ——— POSTAWA ———
add({ id: 'pelvic_tilt', loop: 'pingpong', ms: 1500, elbow: 'down', knee: 'up', env: floorEnv, note: 'Ruch jest niewielki — to miednica, nie pośladki.', frames: [
  F('Neutralnie', { hip: [140, 167], torso: -90, head: -90, hand: S(48, 4), foot: [172, GY], arch: 5 }),
  F('Przechył', { hip: [140, 167], torso: -90, head: -90, hand: S(48, 4), foot: [172, GY], arch: 0 }),
] });
add({ id: 'wall_stance', loop: 'static', ms: 1000, elbow: 'down', knee: 'front', env: [{ t: 'wall', x: 92, y: 0 }], frames: [
  F('Pozycja', stand(S(0, 51), { hip: [104, 100], torso: 0, head: 0, foot: [112, GY] })),
] });

function GROUND_Y() { return 176; }

export const ANIMS = A_;
export const getAnim = (id: string | null | undefined): Anim | undefined => (id ? A_[id] : undefined);
