import { useMemo, useState } from 'react';
import type { DayKind, EquipmentId, GeneratorInput, GoalId, Level, Limitation, Module, Plan, PlanDay, PlanItem } from '../core/types';
import { activePlan, deletePlan, duplicatePlan, nav, savePlan, saveSettings, setDraft, useStore } from '../core/store';
import { t } from '../core/i18n';
import { DAY_NAMES_PL, DAY_SHORT_PL, EQUIPMENT, GOALS, LEVELS, MODULES, MUSCLES } from '../data/muscles';
import { EX_BY_ID, filterExercises } from '../data/exercises';
import { TEMPLATES, buildTemplatePlan } from '../data/templates';
import { GENERATOR_VERSION, dayMinutes, generatePlan, newSeed } from '../engine/generator';
import { draftFromDay } from '../engine/workout';
import { weekdayIndex, uid, startOfWeek, addDays } from '../core/time';
import { buildIcs, trainingDays } from '../engine/ics';
import { Card, Chip, Confirm, Empty, Section, Seg, Sheet, Stepper, Switch, TopBar, download } from '../ui/components';
import { IArrowDown, IArrowUp, IGrip, ICalAdd, ICopy, IEdit, IPlay, IPlus, IRight, ISpark, ITrash, IClose, IDone } from '../ui/icons';
import { planItemFromEx } from '../ui/actions';
import { unlockAudio } from '../core/audio';
import { useDragList } from '../ui/drag';
import { moveItem } from '../engine/reorder';

const KIND_LABEL: Record<DayKind, string> = { rest: 'Odpoczynek', workout: 'Trening', mobility: 'Mobilność', recovery: 'Regeneracja' };
const LIMITS: { id: Limitation; pl: string }[] = [{ id: 'knees', pl: 'Kolana' }, { id: 'back', pl: 'Plecy' }, { id: 'shoulders', pl: 'Barki' }, { id: 'wrists', pl: 'Nadgarstki' }, { id: 'neck', pl: 'Szyja' }];

export function PlanScreen() {
  const plans = useStore((s) => s.plans);
  const plan = useStore((s) => activePlan(s));
  const profile = useStore((s) => s.profile);
  const [editDay, setEditDay] = useState<number | null>(null);
  const [view, setView] = useState<null | 'templates' | 'generator' | 'plans'>(null);
  const today = weekdayIndex(new Date());
  const monday = startOfWeek(new Date());
  const lang = useStore((s) => s.settings.lang);
  const [cal, setCal] = useState<null | { days: number[] | undefined }>(null);

  const update = (days: PlanDay[]) => plan && void savePlan({ ...plan, days });
  const shift = (dir: 1 | -1) => plan && update(dir === 1 ? [plan.days[6], ...plan.days.slice(0, 6)] : [...plan.days.slice(1), plan.days[0]]);

  if (editDay !== null && plan) return <DayEditor plan={plan} idx={editDay} onClose={() => setEditDay(null)} />;
  if (view === 'generator') return <Generator onClose={() => setView(null)} />;

  return (
    <>
      <TopBar title={t('Mój plan')} right={<button className="btn sm" onClick={() => setView('plans')}>{t('Plany')} ({plans.length})</button>} />
      <div className="main stack">
        {!plan ? (
          <Empty icon={<ISpark style={{ width: 40, height: 40 }} />} title={t('Nie masz jeszcze planu')} text={t('Wybierz gotowy szablon albo wygeneruj plan dopasowany do Twoich ustawień.')}
            action={<div className="stack sm" style={{ width: '100%' }}><button className="btn primary" onClick={() => setView('generator')}>{t('Wygeneruj plan')}</button><button className="btn" onClick={() => setView('templates')}>{t('Szablony')}</button></div>} />
        ) : (<>
          <div className="row between"><div><div className="bold">{plan.name}</div><div className="small muted">{plan.generatedFrom ? t('Wygenerowany lokalnie (reguły)') : plan.templateId ? t('Szablon') : t('Własny plan')}</div></div></div>
          <div className="weekhead row between">
            <div className="bold">{weekLabel(monday, lang)}</div>
            <button className="btn sm" onClick={() => setCal({ days: undefined })} disabled={trainingDays(plan).length === 0}><ICalAdd />{t('Dodaj do kalendarza')}</button>
          </div>
          <div className="week" role="list" aria-label={t('Tydzień od poniedziałku do niedzieli')}>
            {plan.days.map((d, i) => {
              const date = addDays(monday, i); const isToday = i === today; const rest = d.kind === 'rest';
              return (
                <button key={i} role="listitem" className={`list-item daytile ${isToday ? 'today' : ''} ${rest ? 'rest' : ''}`} onClick={() => setEditDay(i)}
                  aria-label={`${t(DAY_NAMES_PL[i])} ${date.getDate()} ${monthShort(date, lang)}: ${rest ? t('Odpoczynek') : d.title}${isToday ? `, ${t('dziś')}` : ''}`}>
                  <span className="cal" aria-hidden="true"><span className="cal-wd">{t(DAY_SHORT_PL[i])}</span><span className="cal-day num">{date.getDate()}</span><span className="cal-mo">{monthShort(date, lang)}</span></span>
                  <span className="grow">
                    <div className="bold dt-title">{rest ? t('Odpoczynek') : d.title}</div>
                    <div className="small dt-sub">{rest ? t(KIND_LABEL.rest) : `${t(KIND_LABEL[d.kind])} · ${d.items.length} ${t('ćwiczeń')} · ~${dayMinutes(d)} min`}{isToday ? ` · ${t('dziś')}` : ''}</div>
                  </span>
                  <IRight />
                </button>
              );
            })}
          </div>
          <div className="grid2">
            <button className="btn sm" onClick={() => shift(-1)}>{t('← Przesuń plan o dzień')}</button>
            <button className="btn sm" onClick={() => shift(1)}>{t('Przesuń plan o dzień →')}</button>
          </div>
        </>)}
        <Section title={t('Utwórz')}>
          <div className="grid2">
            <button className="card btn" onClick={() => setView('templates')}><b>{t('Szablony')}</b><div className="small muted">{t('Full Body, PPL, dom, kettlebell…')}</div></button>
            <button className="card btn" onClick={() => setView('generator')}><b>{t('Generator')}</b><div className="small muted">{t('Plan wg Twoich danych')}</div></button>
          </div>
        </Section>
        <div className="tiny faint">{profile ? t('Domyślne akcenty szablonów zależą od profilu, ale każde ćwiczenie możesz dodać i zmienić ręcznie.') : ''}</div>
      </div>
      {cal && plan && <CalendarSheet plan={plan} days={cal.days} onClose={() => setCal(null)} />}
      {view === 'templates' && <Templates onClose={() => setView(null)} />}
      {view === 'plans' && <PlansSheet onClose={() => setView(null)} />}
    </>
  );
}

const locale = (lang: string) => (lang === 'en' ? 'en-GB' : 'pl-PL');
const monthShort = (d: Date, lang: string) => d.toLocaleDateString(locale(lang), { month: 'short' }).replace('.', '');
function weekLabel(monday: Date, lang: string) {
  const sun = addDays(monday, 6);
  const f = (d: Date) => d.toLocaleDateString(locale(lang), { day: 'numeric', month: 'long' });
  return `${t('Ten tydzień')}: ${monday.getDate()}${monday.getMonth() === sun.getMonth() ? '' : ' ' + monthShort(monday, lang)} – ${f(sun)}`;
}

/** Eksport do kalendarza telefonu: plik .ics z powtarzanymi co tydzień wydarzeniami. */
function CalendarSheet({ plan, days, onClose }: { plan: Plan; days: number[] | undefined; onClose: () => void }) {
  const [time, setTime] = useState('18:00');
  const [weeks, setWeeks] = useState(8);
  const [rem, setRem] = useState<number>(30);
  const n = (days ?? trainingDays(plan)).length;
  const go = async () => {
    const ics = buildIcs(plan, { time, weeks, reminderMin: rem === 0 ? null : rem, days });
    const name = `formplus-${plan.name.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'plan'}.ics`;
    try {
      const file = new File([ics], name, { type: 'text/calendar' });
      const nav_ = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav_.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'FORM+' }); onClose(); return; }
    } catch (e) { if ((e as Error)?.name === 'AbortError') return; }
    download(name, ics, 'text/calendar;charset=utf-8');
    nav.toast(t('Pobrano plik kalendarza — otwórz go, aby dodać wydarzenia')); onClose();
  };
  return (
    <Sheet title={t('Dodaj do kalendarza')} onClose={onClose}>
      <div className="stack">
        <div className="small muted">{n} {t('wydarzeń w tygodniu')}: {t('treningi z planu, z listą ćwiczeń w opisie.')}</div>
        <div className="field"><label htmlFor="caltime">{t('Godzina rozpoczęcia')}</label><input id="caltime" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value || '18:00')} /></div>
        <div className="field"><label>{t('Powtarzaj przez')}</label><Seg value={weeks} onChange={setWeeks} options={[4, 8, 12, 26].map((w) => ({ v: w, label: `${w} ${t('tyg.')}` }))} /></div>
        <div className="field"><label>{t('Przypomnienie')}</label><Seg value={rem} onChange={setRem} options={[{ v: 0, label: t('brak') }, { v: 15, label: '15 min' }, { v: 30, label: '30 min' }, { v: 60, label: '1 h' }]} /></div>
        <button className="btn primary big" disabled={n === 0} onClick={() => void go()}><ICalAdd />{t('Dodaj do kalendarza')}</button>
        <p className="tiny faint">{t('Zostanie utworzony plik .ics, który otworzy się w Kalendarzu telefonu (iPhone, Android) albo w programie pocztowym. Późniejsze zmiany planu w aplikacji nie aktualizują wydarzeń w kalendarzu — wyeksportuj plan ponownie.')}</p>
      </div>
    </Sheet>
  );
}

function Templates({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.profile);
  const create = async (id: string) => {
    const p = buildTemplatePlan(id, { gender: profile?.gender ?? 'na', level: profile?.level ?? 'beginner', equipment: profile?.equipment ?? ['bodyweight', 'mat', 'dumbbells', 'kettlebell', 'bench', 'barbell', 'machine', 'cable', 'rack', 'pullup_bar', 'band', 'step'], limitations: profile?.limitations ?? [] });
    await savePlan(p); await saveSettings({ activePlanId: p.id }); nav.toast(t('Utworzono plan: {n}', { n: p.name })); onClose();
  };
  return (
    <Sheet title={t('Szablony planów')} onClose={onClose}>
      <div className="stack sm">{TEMPLATES.map((tp) => (
        <button key={tp.id} className="list-item" onClick={() => void create(tp.id)}>
          <span className="grow"><div className="bold">{t(tp.pl)}</div><div className="small muted">{tp.desc}</div><div className="tiny faint">{tp.days} {t('dni')}/{t('tydz.')}</div></span><IPlus style={{ color: 'var(--teal)' }} />
        </button>))}</div>
      <p className="tiny faint" style={{ marginTop: 10 }}>{t('Dostosowanie do poziomu, sprzętu i ograniczeń z profilu. Nowy plan zostanie ustawiony jako aktywny.')}</p>
    </Sheet>
  );
}

function PlansSheet({ onClose }: { onClose: () => void }) {
  const plans = useStore((s) => s.plans);
  const settings = useStore((s) => s.settings);
  const [ren, setRen] = useState<Plan | null>(null);
  const [del, setDel] = useState<Plan | null>(null);
  const [name, setName] = useState('');
  return (
    <Sheet title={t('Twoje plany')} onClose={onClose}>
      <div className="stack sm">
        {plans.length === 0 && <p className="muted">{t('Brak planów.')}</p>}
        {plans.map((p) => (
          <div key={p.id} className="card flat stack sm">
            <div className="row between"><b>{p.name}</b>{settings.activePlanId === p.id && <span className="tag teal">{t('aktywny')}</span>}</div>
            <div className="row wrap">
              {settings.activePlanId !== p.id && <button className="btn sm primary" onClick={() => void saveSettings({ activePlanId: p.id })}><IDone />{t('Ustaw aktywny')}</button>}
              <button className="btn sm" onClick={() => { setRen(p); setName(p.name); }}><IEdit />{t('Nazwa')}</button>
              <button className="btn sm" onClick={async () => { const c = await duplicatePlan(p.id); if (c) nav.toast(t('Skopiowano plan')); }}><ICopy />{t('Kopiuj')}</button>
              <button className="btn sm danger" onClick={() => setDel(p)}><ITrash />{t('Usuń')}</button>
            </div>
          </div>))}
      </div>
      {ren && <Sheet title={t('Zmień nazwę')} onClose={() => setRen(null)}><div className="stack"><input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label={t('Nazwa planu')} /><button className="btn primary" onClick={() => { if (name.trim()) void savePlan({ ...ren, name: name.trim() }); setRen(null); }}>{t('Zapisz')}</button></div></Sheet>}
      {del && <Confirm danger title={t('Usunąć plan?')} text={`„${del.name}”`} confirmLabel={t('Usuń')} onNo={() => setDel(null)} onYes={() => { void deletePlan(del.id); setDel(null); }} />}
    </Sheet>
  );
}

// ——— edycja dnia ———
function DayEditor({ plan, idx, onClose }: { plan: Plan; idx: number; onClose: () => void }) {
  const day = plan.days[idx];
  const [pick, setPick] = useState(false);
  const [edit, setEdit] = useState<number | null>(null);
  const [target, setTarget] = useState<null | 'copy' | 'move'>(null);
  const [calDay, setCalDay] = useState(false);
  const setDay = (d: PlanDay) => void savePlan({ ...plan, days: plan.days.map((x, i) => (i === idx ? d : x)) });
  const items = day.items;
  const mv = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= items.length) return; setDay({ ...day, items: moveItem(items, i, j) }); };
  const dnd = useDragList((from, to) => setDay({ ...day, items: moveItem(items, from, to) }));

  const apply = (to: number) => {
    const days = [...plan.days];
    if (target === 'copy') days[to] = { ...structuredClone(day) };
    else { days[to] = day; days[idx] = plan.days[to]; }
    void savePlan({ ...plan, days }); setTarget(null); nav.toast(target === 'copy' ? t('Skopiowano dzień') : t('Zamieniono dni'));
  };

  return (
    <div className="overlay">
      <TopBar title={t(DAY_NAMES_PL[idx])} onBack={onClose} />
      <div className="main stack">
        <Seg value={day.kind} onChange={(k) => setDay({ ...day, kind: k, title: k === 'rest' ? t('Odpoczynek') : day.kind === 'rest' ? t(KIND_LABEL[k]) : day.title })}
          options={(['rest', 'workout', 'mobility'] as DayKind[]).map((k) => ({ v: k, label: t(KIND_LABEL[k]) }))} />
        {day.kind !== 'rest' && <div className="field"><label htmlFor="dt">{t('Nazwa dnia')}</label><input id="dt" className="input" value={day.title} onChange={(e) => setDay({ ...day, title: e.target.value })} /></div>}
        {day.kind !== 'rest' && (<>
          <div className="small muted">~{dayMinutes(day)} min · {items.length} {t('ćwiczeń')}</div>
          <div className="stack sm">
            {items.map((it, i) => { const e = EX_BY_ID[it.exId]; const r = dnd.row(i); return (
              <div key={i} ref={r.ref} className={`list-item ${r.className}`} style={{ padding: '8px 8px 8px 4px', ...r.style }}>
                <span className="grip" role="button" tabIndex={-1} aria-label={t('Przeciągnij, aby zmienić kolejność (albo użyj strzałek)')} {...dnd.handle(i)}><IGrip /></span>
                <button className="grow" style={{ background: 'none', border: 0, textAlign: 'left', minHeight: 48 }} onClick={() => setEdit(i)}>
                  <div className="bold">{e?.pl ?? it.exId}</div>
                  <div className="small muted">{it.sets} × {it.seconds ? `${it.seconds}s` : `${it.reps?.[0]}–${it.reps?.[1]}`}{it.weight ? ` · ${it.weight} kg` : ''} · {it.rest}s{it.section === 'warmup' ? ` · ${t('rozgrzewka')}` : it.section === 'cooldown' ? ` · ${t('schłodzenie')}` : ''}</div>
                </button>
                <button className="iconbtn" aria-label={t('W górę')} onClick={() => mv(i, -1)} disabled={i === 0}><IArrowUp /></button>
                <button className="iconbtn" aria-label={t('W dół')} onClick={() => mv(i, 1)} disabled={i === items.length - 1}><IArrowDown /></button>
                <button className="iconbtn" aria-label={t('Usuń')} onClick={() => setDay({ ...day, items: items.filter((_, k) => k !== i) })}><IClose /></button>
              </div>); })}
          </div>
          {items.length === 0 && <Empty title={t('Pusty dzień')} text={t('Dodaj ćwiczenia z biblioteki.')} />}
          <button className="btn block" onClick={() => setPick(true)}><IPlus />{t('Dodaj ćwiczenie')}</button>
          <button className="btn primary big" disabled={items.length === 0} onClick={() => { unlockAudio(); void setDraft(draftFromDay(day, plan.id, idx)); nav.tab('workout'); onClose(); }}><IPlay />{t('Rozpocznij ten trening')}</button>
        </>)}
        {day.kind === 'rest' && <Card className="flat small muted">{t('Dzień odpoczynku. Regeneracja jest częścią treningu — możesz zmienić go na trening lub mobilność.')}</Card>}
        {day.kind !== 'rest' && items.length > 0 && <button className="btn block" onClick={() => setCalDay(true)}><ICalAdd />{t('Dodaj ten dzień do kalendarza')}</button>}
        <div className="grid2">
          <button className="btn sm" onClick={() => setTarget('copy')}><ICopy />{t('Kopiuj do dnia…')}</button>
          <button className="btn sm" onClick={() => setTarget('move')}>{t('Zamień z dniem…')}</button>
        </div>
      </div>
      {pick && <Picker onClose={() => setPick(false)} onPick={(id) => { const e = EX_BY_ID[id]; setDay({ ...day, kind: day.kind === 'rest' ? 'workout' : day.kind, items: [...items, planItemFromEx(e)] }); setPick(false); }} />}
      {edit !== null && <ItemEditor item={items[edit]} onClose={() => setEdit(null)} onSave={(n) => { setDay({ ...day, items: items.map((x, i) => (i === edit ? n : x)) }); setEdit(null); }} />}
      {calDay && <CalendarSheet plan={plan} days={[idx]} onClose={() => setCalDay(false)} />}
      {target && <Sheet title={target === 'copy' ? t('Kopiuj do…') : t('Zamień z…')} onClose={() => setTarget(null)}><div className="stack sm">{plan.days.map((d, i) => i !== idx && <button key={i} className="list-item" onClick={() => apply(i)}><span className="grow"><b>{t(DAY_NAMES_PL[i])}</b><div className="small muted">{d.kind === 'rest' ? t('Odpoczynek') : d.title}</div></span></button>)}</div></Sheet>}
    </div>
  );
}

function ItemEditor({ item, onClose, onSave }: { item: PlanItem; onClose: () => void; onSave: (i: PlanItem) => void }) {
  const [it, setIt] = useState(item);
  const e = EX_BY_ID[it.exId];
  return (
    <Sheet title={e?.pl ?? ''} onClose={onClose}>
      <div className="stack">
        <div className="field"><label>{t('Serie')}</label><Stepper label={t('Serie')} value={it.sets} min={1} max={12} onChange={(v) => setIt({ ...it, sets: v })} /></div>
        {it.seconds !== undefined
          ? <div className="field"><label>{t('Czas (s)')}</label><Stepper label={t('Czas (s)')} value={it.seconds} step={5} min={5} max={900} onChange={(v) => setIt({ ...it, seconds: v })} unit="s" /></div>
          : <><div className="field"><label>{t('Powtórzenia od')}</label><Stepper label={t('Powtórzenia od')} value={it.reps?.[0] ?? 8} min={1} max={100} onChange={(v) => setIt({ ...it, reps: [v, Math.max(v, it.reps?.[1] ?? v)] })} /></div>
            <div className="field"><label>{t('Powtórzenia do')}</label><Stepper label={t('Powtórzenia do')} value={it.reps?.[1] ?? 12} min={1} max={100} onChange={(v) => setIt({ ...it, reps: [Math.min(v, it.reps?.[0] ?? v), v] })} /></div></>}
        {it.seconds === undefined && e?.module === 'posture' && <div className="field"><label>{t('Utrzymanie w powtórzeniu (s)')}</label><Stepper label={t('Utrzymanie w powtórzeniu (s)')} value={it.hold ?? 0} min={0} max={30} onChange={(v) => setIt({ ...it, hold: v || undefined })} unit="s" /></div>}
        <div className="field"><label>{t('Przerwa (s)')}</label><Stepper label={t('Przerwa (s)')} value={it.rest} step={5} min={0} max={600} onChange={(v) => setIt({ ...it, rest: v })} unit="s" /></div>
        {e?.weighted && <div className="field"><label>{t('Ciężar docelowy (kg, opcjonalnie)')}</label><Stepper label={t('Ciężar')} value={it.weight ?? 0} step={1} decimals={1} max={500} onChange={(v) => setIt({ ...it, weight: v || undefined })} unit="kg" /></div>}
        <button className="btn primary" onClick={() => onSave(it)}>{t('Zapisz')}</button>
      </div>
    </Sheet>
  );
}

function Picker({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const profile = useStore((s) => s.profile);
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<Module | 'all'>('all');
  const [mine, setMine] = useState(false);
  const list = useMemo(() => filterExercises({ q, module: mod, equipment: mine ? profile?.equipment : undefined }).slice(0, 60), [q, mod, mine, profile]);
  return (
    <Sheet title={t('Wybierz ćwiczenie')} onClose={onClose}>
      <div className="stack">
        <input className="input" type="search" placeholder={t('Szukaj…')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Szukaj ćwiczeń')} />
        <div className="chips"><Chip on={mod === 'all'} onClick={() => setMod('all')}>{t('Wszystkie')}</Chip>{MODULES.map((m) => <Chip key={m.id} on={mod === m.id} onClick={() => setMod(m.id)}>{t(m.pl)}</Chip>)}{profile && <Chip on={mine} onClick={() => setMine(!mine)}>{t('Mój sprzęt')}</Chip>}</div>
        {list.map((e) => <button key={e.id} className="list-item" onClick={() => onPick(e.id)}><span className="grow"><div className="bold">{e.pl}</div><div className="small muted">{e.primary.map((m) => t(MUSCLES[m].pl)).join(', ')}</div></span><IPlus style={{ color: 'var(--teal)' }} /></button>)}
      </div>
    </Sheet>
  );
}

// ——— generator planu (lokalny, regułowy — to nie jest AI) ———
function Generator({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.profile);
  const plan = useStore((s) => activePlan(s));
  const sessions = useStore((s) => s.sessions);
  const initial: GeneratorInput = plan?.generatedFrom ?? {
    goal: profile?.goal ?? 'fullbody', level: profile?.level ?? 'beginner', days: profile?.daysPerWeek ?? 3, minutes: profile?.minutes ?? 45,
    equipment: profile?.equipment ?? ['bodyweight', 'mat'], location: profile?.location ?? 'both', preferred: profile?.location === 'home' ? ['home', 'kettlebell'] : ['gym'],
    limitations: profile?.limitations ?? [], withWarmup: true, withCooldown: true, withMobilityDays: true, recentExerciseIds: [], seed: newSeed(),
  };
  const [g, setG] = useState<GeneratorInput>(initial);
  const [preview, setPreview] = useState<Plan | null>(null);
  const set = <K extends keyof GeneratorInput>(k: K, v: GeneratorInput[K]) => { setG((x) => ({ ...x, [k]: v })); setPreview(null); };
  const tog = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);
  const recent = useMemo(() => [...new Set(sessions.slice(-4).flatMap((s) => s.items.map((i) => i.exId)))], [sessions]);

  const run = (reseed: boolean) => {
    const input = { ...g, seed: reseed ? newSeed() : g.seed, recentExerciseIds: reseed ? recent : g.recentExerciseIds };
    setG(input); setPreview(generatePlan(input, t('Plan wygenerowany')));
  };
  const save = async (replace: boolean) => {
    if (!preview) return;
    if (replace && plan) { await savePlan({ ...preview, id: plan.id, name: plan.name, createdAt: plan.createdAt }); }
    else { const p = { ...preview, id: uid('plan') }; await savePlan(p); await saveSettings({ activePlanId: p.id }); }
    nav.toast(t('Plan zapisany')); onClose();
  };

  return (
    <div className="overlay">
      <TopBar title={t('Generator planu')} onBack={onClose} />
      <div className="main stack">
        <Card className="flat small muted">{t('To lokalny generator regułowy (bez internetu i bez AI): dobiera ćwiczenia według celu, poziomu, sprzętu, czasu i ograniczeń. Parametry zapisują się razem z planem, a ten sam „ziarno” daje ten sam wynik.')}</Card>
        <div className="field"><label>{t('Cel')}</label><div className="chips wrap">{GOALS.map((x) => <Chip key={x.id} on={g.goal === x.id} onClick={() => set('goal', x.id as GoalId)}>{t(x.pl)}</Chip>)}</div></div>
        <div className="field"><label>{t('Poziom')}</label><Seg value={g.level} onChange={(v) => set('level', v as Level)} options={LEVELS.map((l) => ({ v: l.id as Level, label: t(l.pl.split(' ')[0]) }))} /></div>
        <div className="field"><label>{t('Dni w tygodniu')}</label><Seg value={g.days} onChange={(v) => set('days', v)} options={[2, 3, 4, 5, 6].map((n) => ({ v: n, label: String(n) }))} /></div>
        <div className="field"><label>{t('Czas treningu')}</label><Seg value={g.minutes} onChange={(v) => set('minutes', v)} options={[20, 30, 45, 60, 75].map((n) => ({ v: n, label: `${n}'` }))} /></div>
        <div className="field"><label>{t('Miejsce')}</label><Seg value={g.location} onChange={(v) => set('location', v)} options={[{ v: 'gym', label: t('Siłownia') }, { v: 'home', label: t('Dom') }, { v: 'both', label: t('Oba') }]} /></div>
        <div className="field"><label>{t('Moduły')}</label><div className="chips wrap">{MODULES.filter((m) => m.id !== 'mobility' && m.id !== 'posture').map((m) => <Chip key={m.id} on={g.preferred.includes(m.id)} onClick={() => set('preferred', tog(g.preferred, m.id))}>{t(m.pl)}</Chip>)}</div></div>
        <div className="field"><label>{t('Sprzęt')}</label><div className="chips wrap">{EQUIPMENT.map((e) => <Chip key={e.id} on={g.equipment.includes(e.id as EquipmentId)} onClick={() => e.id !== 'bodyweight' && set('equipment', tog(g.equipment, e.id as EquipmentId))}>{t(e.pl)}</Chip>)}</div></div>
        <div className="field"><label>{t('Oszczędzaj (filtr, nie porada medyczna)')}</label><div className="chips wrap">{LIMITS.map((l) => <Chip key={l.id} on={g.limitations.includes(l.id)} onClick={() => set('limitations', tog(g.limitations, l.id))}>{t(l.pl)}</Chip>)}</div></div>
        <Switch checked={g.withWarmup} onChange={(v) => set('withWarmup', v)} label={t('Dynamiczna rozgrzewka')} />
        <Switch checked={g.withCooldown} onChange={(v) => set('withCooldown', v)} label={t('Rozciąganie po treningu')} />
        <Switch checked={g.withMobilityDays} onChange={(v) => set('withMobilityDays', v)} label={t('Dni mobilności w wolne dni')} />
        <button className="btn primary big" onClick={() => run(false)}><ISpark />{preview ? t('Generuj ponownie (to samo ziarno)') : t('Generuj plan')}</button>
        {preview && (<>
          <Section title={t('Podgląd')} right={<button className="chip" onClick={() => run(true)}>{t('Inny wariant')}</button>}>
            <div className="stack sm">{preview.days.map((d, i) => (
              <div key={i} className="card flat"><div className="row between"><b>{t(DAY_NAMES_PL[i])}</b><span className="small muted">{d.kind === 'rest' ? t('Odpoczynek') : `${d.items.length} ${t('ćwiczeń')} · ~${dayMinutes(d)} min`}</span></div>
                {d.kind !== 'rest' && <><div className="small">{d.title}</div><div className="tiny faint">{d.items.filter((x) => x.section !== 'warmup' && x.section !== 'cooldown').map((x) => EX_BY_ID[x.exId]?.pl).join(' · ')}</div></>}</div>))}</div>
          </Section>
          <p className="tiny faint">v{GENERATOR_VERSION} · seed {g.seed}</p>
          <button className="btn primary" onClick={() => void save(false)}>{t('Zapisz jako nowy plan')}</button>
          {plan && <button className="btn block" onClick={() => void save(true)}>{t('Zastąp aktywny plan')}</button>}
        </>)}
      </div>
    </div>
  );
}
