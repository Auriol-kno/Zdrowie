// Silnik pozy 2D (widok z boku, postać zwrócona w prawo).
// Poza opisana jest celami (biodro, tułów, dłoń, stopa); kończyny rozwiązuje IK dwóch kości,
// więc długości segmentów są zawsze zachowane, a stopy/dłonie "przyklejone" do celów.

export type V2 = [number, number];
export type Bend = 'front' | 'back' | 'down' | 'up';

export const L = { T: 48, N: 20, HR: 9, UA: 26, FA: 25, TH: 37, SH: 37, FT: 13 };
export const GROUND = 176;
export const VIEW_W = 260;
export const VIEW_H = 220;
export const VIEW_Y = -24;

export interface Target { k: 'a' | 's'; x: number; y: number }
export const A = (x: number, y: number): Target => ({ k: 'a', x, y });
export const S = (x: number, y: number): Target => ({ k: 's', x, y }); // względem barku

export interface PoseSpec {
  hip: V2;
  torso: number; // stopnie od pionu w górę; dodatnie = pochylenie do przodu (+x)
  head?: number;
  hand: Target;
  handFar?: Target;
  foot: V2; // cel kostki bliskiej nogi
  footFar?: V2;
  toe?: number; // kierunek stopy: 90 = w prawo (płasko), 0 = w dół
  arch?: number; // wygięcie kręgosłupa w px (+ wypukły w górę, − ugięty w dół)
}

export interface Frame { label: string; pose: PoseSpec }

export interface Impl {
  type: 'barbell' | 'dumbbell' | 'kettlebell' | 'strap';
  at?: 'hand' | 'shoulder' | 'hip';
  mode?: 'hang' | 'forearm' | 'rear' | 'rack';
  off?: V2;
}

export interface Env { t: 'bench' | 'bar' | 'wall' | 'step' | 'mat'; x: number; y: number; w?: number; h?: number }

export interface Anim {
  id: string;
  frames: Frame[];
  loop: 'pingpong' | 'cycle' | 'static';
  ms: number; // czas jednego przejścia
  elbow: Bend;
  knee: Bend;
  impl?: Impl;
  env?: Env[];
  trace?: boolean; // narysuj tor ruchu (dłoń/przyrząd)
  note?: string;
}

/** Cele absolutne (po rozwiązaniu pozycji względnych do barku). */
export interface PoseT {
  hip: V2; torso: number; head: number;
  hand: V2; handFar: V2; foot: V2; footFar: V2; toe: number; arch: number;
}

export interface Joints {
  arch: number;
  hip: V2; shoulder: V2; head: V2;
  elbow: V2; wrist: V2; elbowF: V2; wristF: V2;
  knee: V2; ankle: V2; toe: V2; kneeF: V2; ankleF: V2; toeF: V2;
}

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V2, b: V2, t: number): V2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function shoulderOf(hip: V2, torso: number): V2 {
  return [hip[0] + L.T * Math.sin(rad(torso)), hip[1] - L.T * Math.cos(rad(torso))];
}

export function resolveSpec(p: PoseSpec): PoseT {
  const sh = shoulderOf(p.hip, p.torso);
  const toAbs = (t: Target): V2 => (t.k === 'a' ? [t.x, t.y] : [sh[0] + t.x, sh[1] + t.y]);
  const hand = toAbs(p.hand);
  const handFar = p.handFar ? toAbs(p.handFar) : [hand[0] - 4, hand[1]] as V2;
  const footFar = p.footFar ?? ([p.foot[0] - 7, p.foot[1]] as V2);
  return { hip: p.hip, torso: p.torso, head: p.head ?? p.torso * 0.5, hand, handFar, foot: p.foot, footFar, toe: p.toe ?? 90, arch: p.arch ?? 0 };
}

export function lerpPose(a: PoseT, b: PoseT, t: number): PoseT {
  return {
    hip: lerpV(a.hip, b.hip, t), torso: lerp(a.torso, b.torso, t), head: lerp(a.head, b.head, t),
    hand: lerpV(a.hand, b.hand, t), handFar: lerpV(a.handFar, b.handFar, t),
    foot: lerpV(a.foot, b.foot, t), footFar: lerpV(a.footFar, b.footFar, t), toe: lerp(a.toe, b.toe, t), arch: lerp(a.arch, b.arch, t),
  };
}

/** IK dwóch kości: zwraca staw (kolano/łokieć) i faktyczny koniec (po ewentualnym przycięciu). */
export function ik(root: V2, target: V2, a: number, b: number, bend: Bend): { joint: V2; end: V2 } {
  let dx = target[0] - root[0];
  let dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 1e-6;
  const maxD = a + b - 0.01;
  if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
  const minD = Math.abs(a - b) + 0.01;
  if (d < minD) { const s = minD / d; dx *= s; dy *= s; d = minD; }
  const x = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  const ux = dx / d, uy = dy / d;
  const mid: V2 = [root[0] + ux * x, root[1] + uy * x];
  const c1: V2 = [mid[0] - uy * h, mid[1] + ux * h];
  const c2: V2 = [mid[0] + uy * h, mid[1] - ux * h];
  const pick = (p: V2, q: V2): V2 => {
    switch (bend) {
      case 'front': return p[0] >= q[0] ? p : q;
      case 'back': return p[0] <= q[0] ? p : q;
      case 'down': return p[1] >= q[1] ? p : q;
      default: return p[1] <= q[1] ? p : q;
    }
  };
  return { joint: pick(c1, c2), end: [root[0] + dx, root[1] + dy] };
}

export function solve(p: PoseT, elbow: Bend, knee: Bend): Joints {
  const shoulder = shoulderOf(p.hip, p.torso);
  const head: V2 = [shoulder[0] + L.N * Math.sin(rad(p.head)), shoulder[1] - L.N * Math.cos(rad(p.head))];
  const arm = ik(shoulder, p.hand, L.UA, L.FA, elbow);
  const armF = ik([shoulder[0] - 3, shoulder[1]], p.handFar, L.UA, L.FA, elbow);
  const leg = ik(p.hip, p.foot, L.TH, L.SH, knee);
  const legF = ik([p.hip[0] - 3, p.hip[1]], p.footFar, L.TH, L.SH, knee);
  const toe = (an: V2): V2 => [an[0] + L.FT * Math.sin(rad(p.toe)), an[1] + L.FT * Math.cos(rad(p.toe))];
  return {
    arch: p.arch, hip: p.hip, shoulder, head,
    elbow: arm.joint, wrist: arm.end, elbowF: armF.joint, wristF: armF.end,
    knee: leg.joint, ankle: leg.end, toe: toe(leg.end),
    kneeF: legF.joint, ankleF: legF.end, toeF: toe(legF.end),
  };
}

export const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

/** Kolejność klatek w jednym cyklu. */
export function sequence(anim: Anim): number[] {
  const n = anim.frames.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  if (anim.loop === 'static' || n === 1) return [0];
  if (anim.loop === 'cycle') return idx;
  return [...idx, ...idx.slice(1, -1).reverse()];
}

export const HOLD_MS = 280;

export function cycleMs(anim: Anim): number {
  const seq = sequence(anim);
  return seq.length === 1 ? 1 : seq.length * (anim.ms + HOLD_MS);
}

export interface Sample { pose: PoseT; frame: number; stage: number }

/** Poza w danej chwili cyklu (ms). frame = indeks najbliższej klatki kluczowej. */
export function sampleAt(anim: Anim, tMs: number, resolved?: PoseT[]): Sample {
  const rs = resolved ?? anim.frames.map((f) => resolveSpec(f.pose));
  const seq = sequence(anim);
  if (seq.length === 1) return { pose: rs[0], frame: 0, stage: 0 };
  const seg = anim.ms + HOLD_MS;
  const total = seq.length * seg;
  const t = ((tMs % total) + total) % total;
  const i = Math.floor(t / seg);
  const within = t - i * seg;
  const a = seq[i];
  const b = seq[(i + 1) % seq.length];
  if (within < HOLD_MS) return { pose: rs[a], frame: a, stage: a };
  const u = ease((within - HOLD_MS) / anim.ms);
  return { pose: lerpPose(rs[a], rs[b], u), frame: u < 0.5 ? a : b, stage: u < 0.5 ? a : b };
}

export function implementCenter(j: Joints, impl: Impl): V2 {
  const at = impl.at ?? 'hand';
  if (at === 'shoulder') return add(j.shoulder, impl.off ?? [-3, -2]);
  if (at === 'hip') return add(j.hip, impl.off ?? [0, -4]);
  const w = j.wrist;
  const fx = w[0] - j.elbow[0];
  const fy = w[1] - j.elbow[1];
  const fl = Math.hypot(fx, fy) || 1;
  const u: V2 = [fx / fl, fy / fl];
  if (impl.off) return add(w, impl.off);
  switch (impl.mode) {
    case 'forearm': return [w[0] + u[0] * 12, w[1] + u[1] * 12];
    case 'rear': return [w[0] + u[1] * 11, w[1] - u[0] * 11];
    case 'rack': return [w[0] - 3, w[1] + 7];
    case 'hang':
    default: return [w[0], w[1] + 13];
  }
}

/** Tor ruchu przyrządu (lub dłoni) w jednym przejściu tam i z powrotem. */
export function traceOf(anim: Anim, steps = 48): V2[] {
  const rs = anim.frames.map((f) => resolveSpec(f.pose));
  const seq = sequence(anim);
  const pts: V2[] = [];
  const pathFor = (a: number, b: number) => {
    for (let s = 0; s <= steps; s++) {
      const p = lerpPose(rs[a], rs[b], ease(s / steps));
      const j = solve(p, anim.elbow, anim.knee);
      pts.push(anim.impl ? implementCenter(j, anim.impl) : j.wrist);
    }
  };
  const forward = anim.loop === 'pingpong' ? seq.slice(0, anim.frames.length) : [...seq, seq[0]];
  for (let i = 0; i < forward.length - 1; i++) pathFor(forward[i], forward[i + 1]);
  return pts;
}
