// Eksport planu do kalendarza (plik .ics, RFC 5545). Czysta logika, bez UI.
import type { Plan, PlanDay, PlanItem } from '../core/types';
import { EX_BY_ID } from '../data/exercises';
import { addDays, pad, weekdayIndex } from '../core/time';
import { dayMinutes } from './generator';

export interface IcsOptions {
  time: string;               // "HH:MM" — lokalna godzina rozpoczęcia
  weeks: number;              // ile tygodni powtarzać (1–52)
  reminderMin: number | null; // przypomnienie przed treningiem (min) albo brak
  days?: number[];            // indeksy dni (0 = pn); domyślnie wszystkie dni treningowe
  now?: Date;                 // do testów
}

export const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Składanie linii do 75 oktetów UTF-8 (CRLF + spacja), bez rozcinania znaków wielobajtowych. */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = []; let cur = ''; let bytes = 0; let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

export function parseTime(s: string): { h: number; m: number } {
  const mt = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  const h = mt ? Number(mt[1]) : 18; const m = mt ? Number(mt[2]) : 0;
  return { h: Math.min(23, Math.max(0, h)), m: Math.min(59, Math.max(0, m)) };
}

/** Najbliższy termin danego dnia tygodnia o podanej godzinie (dziś, jeśli godzina jeszcze nie minęła). */
export function nextOccurrence(dayIdx: number, time: string, now: Date): Date {
  const { h, m } = parseTime(time);
  const base = addDays(now, (dayIdx - weekdayIndex(now) + 7) % 7);
  const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0);
  return at.getTime() <= now.getTime() ? new Date(at.getFullYear(), at.getMonth(), at.getDate() + 7, h, m, 0) : at;
}

const itemLine = (it: PlanItem) => {
  const name = EX_BY_ID[it.exId]?.pl ?? it.exId;
  const dose = it.seconds ? `${it.sets} × ${it.seconds} s` : it.reps ? `${it.sets} × ${it.reps[0] === it.reps[1] ? it.reps[0] : `${it.reps[0]}–${it.reps[1]}`}` : `${it.sets} serie`;
  return `• ${name} — ${dose}${it.hold ? `, utrzymanie ${it.hold} s` : ''}`;
};

export const trainingDays = (plan: Plan) => plan.days.map((d, i) => (d.kind === 'rest' || d.items.length === 0 ? -1 : i)).filter((i) => i >= 0);

export function buildIcs(plan: Plan, opts: IcsOptions): string {
  const now = opts.now ?? new Date();
  const weeks = Math.min(52, Math.max(1, Math.round(opts.weeks)));
  const idxs = (opts.days ?? trainingDays(plan)).filter((i) => i >= 0 && i < 7 && plan.days[i].kind !== 'rest' && plan.days[i].items.length > 0);
  const L: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FORM+//Plan treningowy//PL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEscape(`FORM+ — ${plan.name}`)}`];
  for (const i of idxs) {
    const d: PlanDay = plan.days[i];
    const start = nextOccurrence(i, opts.time, now);
    const end = new Date(start.getTime() + Math.max(10, dayMinutes(d)) * 60000);
    L.push('BEGIN:VEVENT', `UID:${plan.id}-d${i}@formplus`, `DTSTAMP:${stamp(now)}`, `DTSTART:${local(start)}`, `DTEND:${local(end)}`,
      `RRULE:FREQ=WEEKLY;COUNT=${weeks}`, `SUMMARY:${icsEscape(`FORM+: ${d.title}`)}`,
      `DESCRIPTION:${icsEscape([`~${dayMinutes(d)} min`, ...d.items.map(itemLine)].join('\n'))}`, 'CATEGORIES:FORM+');
    if (opts.reminderMin !== null) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Trening FORM+', `TRIGGER:-PT${Math.max(1, opts.reminderMin)}M`, 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n') + '\r\n';
}
