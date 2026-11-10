// Renderer SVG (czysty string) dla silnika pozy — używany przez UI (Figure) i testy/podgląd.
import { GROUND, VIEW_H, VIEW_W, VIEW_Y, L, implementCenter, solve, traceOf, type Anim, type Env, type Joints, type PoseT, type V2 } from './figure';

const f = (n: number) => n.toFixed(1);
const P = (p: V2) => `${f(p[0])},${f(p[1])}`;

const limb = (a: V2, b: V2, c: V2, w: number, cls: string) =>
  `<polyline class="${cls}" points="${P(a)} ${P(b)} ${P(c)}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function torsoPath(j: Joints): string {
  const dx = j.shoulder[0] - j.hip[0];
  const dy = j.shoulder[1] - j.hip[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = dy / len;
  const ny = -dx / len;
  const mx = (j.hip[0] + j.shoulder[0]) / 2 + nx * j.arch * 2;
  const my = (j.hip[1] + j.shoulder[1]) / 2 + ny * j.arch * 2;
  return `<path class="fg-torso" d="M${P(j.hip)} Q${f(mx)},${f(my)} ${P(j.shoulder)}" fill="none" stroke-width="15" stroke-linecap="round"/>`;
}

function envSvg(e: Env): string {
  switch (e.t) {
    case 'bench': {
      const w = e.w ?? 100;
      const h = e.h ?? 8;
      return `<g class="env"><rect x="${e.x}" y="${e.y}" width="${w}" height="${h}" rx="4"/><line x1="${e.x + 8}" y1="${e.y + h}" x2="${e.x + 8}" y2="${GROUND}" stroke-width="4"/><line x1="${e.x + w - 8}" y1="${e.y + h}" x2="${e.x + w - 8}" y2="${GROUND}" stroke-width="4"/></g>`;
    }
    case 'bar':
      return `<g class="env"><line x1="${e.x}" y1="${e.y}" x2="${e.x + (e.w ?? 60)}" y2="${e.y}" stroke-width="5" stroke-linecap="round"/><line x1="${e.x}" y1="${e.y}" x2="${e.x}" y2="${e.y - 14}" stroke-width="3"/><line x1="${e.x + (e.w ?? 60)}" y1="${e.y}" x2="${e.x + (e.w ?? 60)}" y2="${e.y - 14}" stroke-width="3"/></g>`;
    case 'wall':
      return `<g class="env"><line x1="${e.x}" y1="${VIEW_Y}" x2="${e.x}" y2="${GROUND}" stroke-width="3"/><line x1="${e.x}" y1="${GROUND}" x2="${e.x + 24}" y2="${GROUND}" stroke-width="0"/></g>`;
    case 'step':
      return `<g class="env"><rect x="${e.x}" y="${e.y}" width="${e.w ?? 50}" height="${e.h ?? 20}" rx="3"/></g>`;
    case 'mat':
      return `<g class="env"><rect x="${e.x}" y="${GROUND - 1}" width="${e.w ?? 200}" height="6" rx="3"/></g>`;
  }
}

function implSvg(j: Joints, anim: Anim): string {
  const im = anim.impl;
  if (!im) return '';
  if (im.type === 'strap') return `<line class="strap" x1="${P(j.wrist).split(',')[0]}" y1="${P(j.wrist).split(',')[1]}" x2="${f(j.ankle[0])}" y2="${f(j.ankle[1])}" stroke-width="2.5" stroke-dasharray="4 3"/>`;
  const draw = (c: V2, wrist: V2) => {
    if (im.type === 'barbell') return `<circle class="plate" cx="${f(c[0])}" cy="${f(c[1])}" r="19" stroke-width="3"/><circle class="bar" cx="${f(c[0])}" cy="${f(c[1])}" r="3.5"/>`;
    if (im.type === 'dumbbell') return `<rect class="db" x="${f(c[0] - 6)}" y="${f(c[1] - 8)}" width="12" height="16" rx="4"/>`;
    const hx = wrist[0] - c[0];
    const hy = wrist[1] - c[1];
    const hl = Math.hypot(hx, hy) || 1;
    return `<line class="kbh" x1="${f(c[0] + (hx / hl) * 6)}" y1="${f(c[1] + (hy / hl) * 6)}" x2="${f(c[0] + (hx / hl) * 15)}" y2="${f(c[1] + (hy / hl) * 15)}" stroke-width="4.5" stroke-linecap="round"/><circle class="kb" cx="${f(c[0])}" cy="${f(c[1])}" r="9.5"/>`;
  };
  let out = draw(implementCenter(j, im), j.wrist);
  if (anim.id === 'carry_farmer') {
    const fj: Joints = { ...j, wrist: j.wristF, elbow: j.elbowF };
    out = draw(implementCenter(fj, im), j.wristF) + out;
  }
  return out;
}

export function figureInner(anim: Anim, pose: PoseT, trace?: V2[]): string {
  const j = solve(pose, anim.elbow, anim.knee);
  const env = (anim.env ?? []).map(envSvg).join('');
  const ground = `<line class="ground" x1="6" y1="${GROUND}" x2="${VIEW_W - 6}" y2="${GROUND}" stroke-width="2"/>`;
  const ft = (an: V2, to: V2, cls: string) => `<line class="${cls}" x1="${f(an[0])}" y1="${f(an[1])}" x2="${f(to[0])}" y2="${f(to[1])}" stroke-width="6" stroke-linecap="round"/>`;
  const far = ft(j.ankleF, j.toeF, 'fg-far') + limb(j.hip, j.kneeF, j.ankleF, 9, 'fg-far') + limb(j.shoulder, j.elbowF, j.wristF, 7, 'fg-far');
  const near = ft(j.ankle, j.toe, 'fg') + limb(j.hip, j.knee, j.ankle, 10, 'fg') + torsoPath(j)
    + `<line class="fg" x1="${f(j.shoulder[0])}" y1="${f(j.shoulder[1])}" x2="${f(j.head[0])}" y2="${f(j.head[1])}" stroke-width="7" stroke-linecap="round"/>`
    + `<circle class="fg-head" cx="${f(j.head[0])}" cy="${f(j.head[1])}" r="${L.HR}"/>`
    + limb(j.shoulder, j.elbow, j.wrist, 8, 'fg');
  const tr = trace && trace.length > 1 ? `<polyline class="trace" points="${trace.map(P).join(' ')}" fill="none" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/>` : '';
  return `${ground}${env}${far}${near}${tr}${implSvg(j, anim)}`;
}

export const SVG_STYLE = `
.fg,.fg-torso{stroke:var(--fig,#dbe4ef)} .fg-head{fill:var(--fig,#dbe4ef)}
.fg-far{stroke:var(--fig,#dbe4ef);opacity:.42}
.ground{stroke:var(--env,#3b4658)} .env rect{fill:var(--env,#3b4658)} .env line{stroke:var(--env,#3b4658)}
.plate{fill:rgba(45,212,191,.16);stroke:var(--teal,#2dd4bf)} .bar{fill:var(--teal,#2dd4bf)}
.db{fill:var(--teal,#2dd4bf)} .kb{fill:var(--teal,#2dd4bf)} .kbh{stroke:var(--teal,#2dd4bf)}
.strap{stroke:var(--teal,#2dd4bf)} .trace{stroke:var(--blue,#38bdf8);opacity:.85}`;

export function figureSvg(anim: Anim, pose: PoseT, withTrace = false, size?: { w?: number; h?: number }): string {
  const tr = withTrace ? traceOf(anim) : undefined;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${VIEW_Y} ${VIEW_W} ${VIEW_H}"${size?.w ? ` width="${size.w}"` : ''}${size?.h ? ` height="${size.h}"` : ''}><style>${SVG_STYLE}</style>${figureInner(anim, pose, tr)}</svg>`;
}
