import { useMemo, useState } from 'react';
import type { EquipmentId, Exercise, Level, Module, MuscleId } from '../core/types';
import { activePlan, nav, useStore } from '../core/store';
import { t } from '../core/i18n';
import { EQUIPMENT, LEVELS, MODULES, MUSCLES, MUSCLE_IDS } from '../data/muscles';
import { EX_BY_ID, estimateSec, exercisesForMuscle, filterExercises } from '../data/exercises';
import { ROUTINES, routineMinutes } from '../data/routines';
import { TimersScreen } from './Timers';
import { Card, Chip, Empty, Section, Seg, Sheet, TopBar } from '../ui/components';
import { FigureThumb, Figure } from '../ui/Figure';
import { AtlasLegend, MuscleMap } from '../ui/Atlas';
import { IPosture, IStretch, IFilter, IPlus, ISearch, IRight, IClock } from '../ui/icons';
import { addExerciseToPlan, addExerciseToWorkout } from '../ui/actions';
import { DAY_NAMES_PL } from '../data/muscles';
import { exerciseHistory, lastPerformance, personalRecords } from '../engine/stats';
import { suggestNext } from '../engine/progression';

const levelName = (l: Level) => t(LEVELS.find((x) => x.id === l)!.pl);
const mod = (m: Module) => t(MODULES.find((x) => x.id === m)!.pl);

export function ExerciseRow({ ex, onAdd }: { ex: Exercise; onAdd?: () => void }) {
  return (
    <div className="list-item" style={{ padding: 8, paddingRight: 8 }}>
      <button className="row grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0, minHeight: 56 }} onClick={() => nav.push({ name: 'exercise', id: ex.id })}>
        <FigureThumb animationId={ex.animationId} fallback={ex.pl} />
        <span className="grow">
          <div className="bold">{ex.pl}</div>
          <div className="small muted">{ex.primary.map((m) => t(MUSCLES[m].pl)).join(', ')}</div>
          <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
            <span className="tag">{levelName(ex.level)}</span>
            <span className="tag">{mod(ex.module)}</span>
            {ex.animationId && <span className="tag teal">{t('animacja')}</span>}
          </div>
        </span>
      </button>
      {onAdd && <button className="iconbtn fill" onClick={onAdd} aria-label={t('Dodaj do treningu: {n}', { n: ex.pl })}><IPlus /></button>}
    </div>
  );
}

type Mode = 'list' | 'atlas' | 'programs' | 'timers';

export function LibraryScreen() {
  const [mode, setMode] = useState<Mode>('list');
  return (
    <>
      <TopBar title={t('Ćwiczenia')} />
      <div className="main stack">
        <Seg value={mode} onChange={setMode} options={[{ v: 'list', label: t('Lista') }, { v: 'atlas', label: t('Atlas mięśni') }, { v: 'programs', label: t('Programy') }, { v: 'timers', label: t('Timery') }]} />
        {mode === 'list' && <List />}
        {mode === 'atlas' && <Atlas />}
        {mode === 'programs' && <Programs />}
        {mode === 'timers' && <TimersScreen embedded />}
      </div>
    </>
  );
}

function List() {
  const profile = useStore((s) => s.profile);
  const [q, setQ] = useState('');
  const [module, setModule] = useState<Module | 'all'>('all');
  const [muscle, setMuscle] = useState<MuscleId | null>(null);
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [maxMin, setMaxMin] = useState<number | null>(null);
  const [place, setPlace] = useState<'all' | 'gym' | 'home'>('all');
  const [myEq, setMyEq] = useState(false);
  const [eq, setEq] = useState<EquipmentId[]>([]);
  const [sheet, setSheet] = useState(false);

  const equipment = myEq ? profile?.equipment : eq.length ? eq : undefined;
  const list = useMemo(() => filterExercises({ q, module, muscle, level, maxMinutes: maxMin, place, equipment }), [q, module, muscle, level, maxMin, place, equipment]);
  const active = [muscle, level !== 'all', maxMin, place !== 'all', myEq, eq.length].filter(Boolean).length;
  const reset = () => { setMuscle(null); setLevel('all'); setMaxMin(null); setPlace('all'); setMyEq(false); setEq([]); };

  return (
    <>
      <div className="row">
        <div className="grow" style={{ position: 'relative' }}>
          <input className="input" type="search" placeholder={t('Szukaj: nazwa, mięsień, sprzęt…')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Szukaj ćwiczeń')} style={{ paddingLeft: 42 }} />
          <ISearch style={{ position: 'absolute', left: 14, top: 15, width: 22, height: 22, color: 'var(--faint)' }} />
        </div>
        <button className="iconbtn fill" onClick={() => setSheet(true)} aria-label={t('Filtry')} style={{ position: 'relative' }}><IFilter />{active > 0 && <span className="dot" style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: '50%', background: 'var(--warn)' }} />}</button>
      </div>
      <div className="grid2">
        <button className="card btn posture-entry" onClick={() => nav.push({ name: 'builder', section: 'spine' })}><IPosture /><span className="grow" style={{ textAlign: 'left' }}><div className="bold">{t('Kręgosłup')}</div><div className="small muted">{t('Lordoza, skolioza — własne zestawy')}</div></span></button>
        <button className="card btn posture-entry" onClick={() => nav.push({ name: 'builder', section: 'stretch' })}><IStretch /><span className="grow" style={{ textAlign: 'left' }}><div className="bold">{t('Rozciąganie')}</div><div className="small muted">{t('Własne zestawy i czasy')}</div></span></button>
      </div>
      <div className="chips">
        <Chip on={module === 'all'} onClick={() => setModule('all')}>{t('Wszystkie')}</Chip>
        {MODULES.map((m) => <Chip key={m.id} on={module === m.id} onClick={() => setModule(m.id)}>{t(m.pl)}</Chip>)}
      </div>
      <div className="small muted">{t('Znaleziono: {n}', { n: list.length })}{active > 0 && <> · <button className="chip" style={{ minHeight: 28 }} onClick={reset}>{t('Wyczyść filtry')}</button></>}</div>
      {list.length === 0
        ? <Empty title={t('Brak wyników')} text={t('Zmień filtry lub wyszukiwane słowo.')} action={<button className="btn sm" onClick={() => { reset(); setQ(''); setModule('all'); }}>{t('Wyczyść')}</button>} />
        : <div className="stack sm">{list.map((e) => <ExerciseRow key={e.id} ex={e} onAdd={() => addExerciseToWorkout(e)} />)}</div>}
      {sheet && (
        <Sheet title={t('Filtry')} onClose={() => setSheet(false)}>
          <div className="stack">
            <div className="label">{t('Partia mięśniowa')}</div>
            <div className="chips wrap">
              <Chip on={muscle === null} onClick={() => setMuscle(null)}>{t('Dowolna')}</Chip>
              {MUSCLE_IDS.map((m) => <Chip key={m} on={muscle === m} onClick={() => setMuscle(m)}>{t(MUSCLES[m].pl)}</Chip>)}
            </div>
            <div className="label">{t('Poziom')}</div>
            <Seg value={level} onChange={setLevel} options={[{ v: 'all', label: t('Wszystkie') }, ...LEVELS.map((l) => ({ v: l.id as Level | 'all', label: t(l.pl.split(' ')[0]) }))]} />
            <div className="label">{t('Miejsce')}</div>
            <Seg value={place} onChange={setPlace} options={[{ v: 'all', label: t('Wszędzie') }, { v: 'gym', label: t('Siłownia') }, { v: 'home', label: t('Dom') }]} />
            <div className="label">{t('Maks. czas ćwiczenia')}</div>
            <Seg value={maxMin ?? 0} onChange={(v) => setMaxMin(v || null)} options={[{ v: 0, label: t('Bez limitu') }, { v: 3, label: '3 min' }, { v: 5, label: '5 min' }, { v: 8, label: '8 min' }]} />
            <div className="label">{t('Sprzęt')}</div>
            {profile && <Chip on={myEq} onClick={() => setMyEq((v) => !v)}>{t('Tylko mój sprzęt z profilu')}</Chip>}
            {!myEq && <div className="chips wrap">{EQUIPMENT.map((e) => <Chip key={e.id} on={eq.includes(e.id)} onClick={() => setEq(eq.includes(e.id) ? eq.filter((x) => x !== e.id) : [...eq, e.id])}>{t(e.pl)}</Chip>)}</div>}
            <button className="btn primary" onClick={() => setSheet(false)}>{t('Pokaż wyniki ({n})', { n: list.length })}</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Atlas() {
  const profile = useStore((s) => s.profile);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [gender, setGender] = useState<'female' | 'male'>(profile?.gender === 'female' ? 'female' : 'male');
  const [sel, setSel] = useState<MuscleId | null>(null);
  const [myEq, setMyEq] = useState(false);
  const list = sel ? exercisesForMuscle(sel, myEq ? profile?.equipment : undefined) : [];
  return (
    <>
      <div className="grid2">
        <Seg value={view} onChange={setView} options={[{ v: 'front', label: t('Przód') }, { v: 'back', label: t('Tył') }]} />
        <Seg value={gender} onChange={setGender} options={[{ v: 'female', label: t('Kobieta') }, { v: 'male', label: t('Mężczyzna') }]} />
      </div>
      <Card>
        <MuscleMap view={view} gender={gender} selected={sel} onSelect={(m) => setSel(sel === m ? null : m)} />
        <div className="small muted center">{t('Dotknij mięśnia, aby zobaczyć ćwiczenia.')}</div>
      </Card>
      {sel ? (
        <div className="stack sm">
          <div className="card flat">
            <h3>{t(MUSCLES[sel].pl)}</h3>
            <p className="small muted">{MUSCLES[sel].detailPl}</p>
          </div>
          {profile && <Chip on={myEq} onClick={() => setMyEq((v) => !v)}>{t('Tylko mój sprzęt')}</Chip>}
          <div className="small muted">{t('Ćwiczenia ({n})', { n: list.length })}</div>
          {list.map((e) => <ExerciseRow key={e.id} ex={e} onAdd={() => addExerciseToWorkout(e)} />)}
          {list.length === 0 && <Empty title={t('Brak ćwiczeń z Twoim sprzętem')} text={t('Wyłącz filtr sprzętu, aby zobaczyć wszystkie.')} />}
        </div>
      ) : (
        <>
          <div className="small muted">{t('Wybierz partię z listy:')}</div>
          <div className="chips wrap">{(Object.keys(MUSCLES) as MuscleId[]).filter((m) => MUSCLES[m].views.includes(view)).map((m) => <Chip key={m} onClick={() => setSel(m)}>{t(MUSCLES[m].pl)}</Chip>)}</div>
        </>
      )}
      <div className="tiny faint">{t('Atlas jest schematyczny (2D). Struktura danych jest gotowa na przyszły widok 3D.')}</div>
    </>
  );
}

function Programs() {
  const groups: { id: 'themed' | 'area' | 'warmup'; title: string }[] = [
    { id: 'themed', title: t('Programy tematyczne') }, { id: 'area', title: t('Sesje na partie ciała') }, { id: 'warmup', title: t('Rozgrzewki dynamiczne') },
  ];
  return (
    <>
      <div className="card flat small muted">{t('Rozciąganie dynamiczne (ruch) służy do rozgrzewki, statyczne (utrzymanie pozycji) — do schłodzenia po treningu lub jako osobna sesja. Nie rozciągaj się przez ból; łagodne napięcie jest w porządku.')}</div>
      {groups.map((g) => (
        <Section key={g.id} title={g.title}>
          <div className="stack sm">
            {ROUTINES.filter((r) => r.group === g.id).map((r) => (
              <button key={r.id} className="list-item" onClick={() => nav.push({ name: 'routine', id: r.id })}>
                <span className="thumb"><IClock style={{ width: 24, height: 24 }} /></span>
                <span className="grow"><div className="bold">{r.pl}</div><div className="small muted">{r.desc}</div><div className="tiny faint">{t('{m} min · {n} pozycji', { m: routineMinutes(r), n: r.steps.length })}</div></span>
                <IRight style={{ color: 'var(--faint)' }} />
              </button>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

export function ExerciseDetail({ id }: { id: string }) {
  const ex = EX_BY_ID[id];
  const sessions = useStore((s) => s.sessions);
  const plan = useStore((s) => activePlan(s));
  const [planSheet, setPlanSheet] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const hist = useMemo(() => exerciseHistory(sessions, id), [sessions, id]);
  const pr = useMemo(() => personalRecords(sessions)[id], [sessions, id]);
  const last = useMemo(() => lastPerformance(sessions, id), [sessions, id]);
  const sug = useMemo(() => (ex?.weighted ? suggestNext(ex, sessions) : null), [ex, sessions]);
  if (!ex) return <div className="overlay"><TopBar title={t('Nie znaleziono')} onBack={nav.pop} /></div>;
  const isStretch = ex.module === 'mobility';
  const sc = ex.scheme;
  const stretchLabel: Record<string, string> = { dynamic: 'Dynamiczne', static: 'Statyczne', active: 'Aktywne', pnf: 'PNF (z napięciem mięśnia)', mobilization: 'Mobilizacja', activation: 'Aktywacja', breathing: 'Oddech' };

  return (
    <div className="overlay">
      <TopBar title={ex.pl} onBack={nav.pop} />
      <div className="main stack">
        <Figure animationId={ex.animationId} />
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tag">{levelName(ex.level)}</span><span className="tag">{mod(ex.module)}</span>
          {ex.stretchType && <span className="tag blue">{t(stretchLabel[ex.stretchType])}</span>}
          {ex.equipment.filter((e) => t(EQUIPMENT.find((x) => x.id === e)!.pl) !== mod(ex.module)).map((e) => <span key={e} className="tag">{t(EQUIPMENT.find((x) => x.id === e)!.pl)}</span>)}
        </div>
        <div className="small muted">EN: {ex.en}</div>

        <div className="grid2">
          <button className="btn primary" onClick={() => addExerciseToWorkout(ex)}><IPlus />{t('Do treningu')}</button>
          <button className="btn" onClick={() => (plan ? setPlanSheet(true) : nav.toast(t('Brak aktywnego planu.')))}>{t('Do planu')}</button>
        </div>

        <Card>
          <h3>{t('Zaangażowane mięśnie')}</h3>
          <div className="grid2" style={{ marginTop: 8 }}>
            <MuscleMap view="front" primary={ex.primary} secondary={ex.secondary} height={210} />
            <MuscleMap view="back" primary={ex.primary} secondary={ex.secondary} height={210} />
          </div>
          <AtlasLegend />
          <div className="small" style={{ marginTop: 8 }}><b>{t('Główne')}:</b> {ex.primary.map((m) => t(MUSCLES[m].pl)).join(', ')}</div>
          {ex.secondary.length > 0 && <div className="small"><b>{t('Pomocnicze')}:</b> {ex.secondary.map((m) => t(MUSCLES[m].pl)).join(', ')}</div>}
        </Card>

        <Card>
          <h3>{t('Zalecany schemat')}</h3>
          <p className="muted">{sc.sets} × {sc.seconds ? `${sc.seconds} s` : `${sc.reps![0]}–${sc.reps![1]} ${t('powt.')}`}{sc.perSide ? ` ${t('na stronę')}` : ''}{!isStretch && ` · ${t('przerwa')} ${sc.rest} s`}</p>
          <p className="small muted">{t('Szacowany czas: ok. {m} min', { m: Math.max(1, Math.round(estimateSec(ex) / 60)) })}</p>
        </Card>

        {(last || pr || sug) && (
          <Card>
            <h3>{t('Twoje wyniki')}</h3>
            {last && <p className="small">{t('Ostatnio')} ({last.date}): {last.sets.map((s) => s.seconds ? `${s.seconds}s` : `${s.weight ? s.weight + 'kg×' : ''}${s.reps ?? ''}`).join(' · ')}</p>}
            {pr && <p className="small">{t('Rekord')}: {pr.weight} kg × {pr.reps} ({t('szac. 1RM')} {pr.e1rm.toFixed(1)} kg)</p>}
            {sug && <p className="small muted">{t('Propozycja na dziś')}: {sug.weight ? `${sug.weight} kg` : ''} {sug.reps ? `× ${sug.reps}` : ''} — {sug.reason}</p>}
            {hist.length > 0 && <p className="tiny faint">{t('Sesji z tym ćwiczeniem: {n}', { n: hist.length })}</p>}
          </Card>
        )}

        <Card><h3>{t('Jak wykonać')}</h3><ol className="stack sm" style={{ margin: '8px 0 0', paddingLeft: 20 }}>{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></Card>
        <Card><h3>{t('Wskazówki')}</h3><ul className="stack sm" style={{ margin: '8px 0 0', paddingLeft: 20 }}>{ex.cues.map((s, i) => <li key={i}>{s}</li>)}</ul></Card>
        <Card><h3>{t('Najczęstsze błędy')}</h3><ul className="stack sm" style={{ margin: '8px 0 0', paddingLeft: 20 }}>{ex.mistakes.map((s, i) => <li key={i}>{s}</li>)}</ul></Card>
        <Card><h3>{t('Oddech')}</h3><p className="muted">{ex.breathing}</p></Card>
        {ex.contra && <Card className="warn"><h3>{t('Doświadczenie i ostrożność')}</h3><p className="small">{ex.contra}</p></Card>}
        <Card className="warn"><h3>{t('Bezpieczeństwo')}</h3><ul className="stack sm" style={{ margin: '8px 0 0', paddingLeft: 20 }}>{ex.safety.map((s, i) => <li key={i} className="small">{s}</li>)}</ul></Card>

        {ex.alt.length > 0 && (
          <Section title={t('Alternatywy')}>
            <div className="stack sm">{ex.alt.map((a) => EX_BY_ID[a] && <ExerciseRow key={a} ex={EX_BY_ID[a]} />)}</div>
          </Section>
        )}
        <button className="chip" onClick={() => setShowAll((v) => !v)} style={{ display: 'none' }} />
      </div>
      {planSheet && plan && (
        <Sheet title={t('Dodaj do planu: wybierz dzień')} onClose={() => setPlanSheet(false)}>
          <div className="stack sm">{plan.days.map((d, i) => (
            <button key={i} className="list-item" onClick={() => { addExerciseToPlan(plan, i, ex); setPlanSheet(false); }}>
              <span className="grow"><div className="bold">{t(DAY_NAMES_PL[i])}</div><div className="small muted">{d.kind === 'rest' ? t('Odpoczynek') : d.title}</div></span><IPlus />
            </button>))}</div>
        </Sheet>
      )}
    </div>
  );
}
