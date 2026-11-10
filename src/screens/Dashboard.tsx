import { useMemo } from 'react';
import { activePlan, nav, setDraft, useStore } from '../core/store';
import { t } from '../core/i18n';
import { DAY_SHORT_PL } from '../data/muscles';
import { addDays, dateKey, startOfWeek, weekdayIndex } from '../core/time';
import { dayMinutes } from '../engine/generator';
import { draftFromDay } from '../engine/workout';
import { activeStreak, daysSince, sessionSets, weeklySeries } from '../engine/stats';
import { Card, Section, TopBar } from '../ui/components';
import { ProfileButton } from '../ui/ProfileSwitcher';
import { IPosture, IActivity, IBody, IDone, IFlame, IPlay, ISettings, IStretch, ITimer, IWarn, IClock } from '../ui/icons';
import { shortVersion, startRoutineWorkout } from '../ui/actions';
import { ROUTINE_BY_ID } from '../data/routines';
import { unlockAudio } from '../core/audio';
import { fmtClock } from '../core/time';

export function Dashboard() {
  const profile = useStore((s) => s.profile);
  const settings = useStore((s) => s.settings);
  const plan = useStore((s) => activePlan(s));
  const sessions = useStore((s) => s.sessions);
  const draft = useStore((s) => s.draft);
  const today = new Date();
  const ti = weekdayIndex(today);
  const day = plan?.days[ti];
  const weekStart = startOfWeek(today);
  const doneDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const doneToday = doneDates.has(dateKey(today));
  const wk = useMemo(() => weeklySeries(sessions, 1)[0], [sessions]);
  const streak = useMemo(() => activeStreak(sessions), [sessions]);
  const since = daysSince(sessions);
  const planned = plan ? plan.days.filter((d) => d.kind === 'workout').length : 0;
  const hour = today.getHours();
  const hello = hour < 11 ? t('Dzień dobry') : hour < 18 ? t('Cześć') : t('Dobry wieczór');

  return (
    <>
      <TopBar brand title="FORM+" right={<><ProfileButton /><button className="iconbtn fill" onClick={() => nav.push({ name: 'settings' })} aria-label={t('Ustawienia i profil')}><ISettings /></button></>} />
      <div className="main stack">
        <div><h1>{hello}{profile?.name ? `, ${profile.name}` : ''}!</h1><div className="muted small">{today.toLocaleDateString(settings.lang === 'en' ? 'en-GB' : 'pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>

        {draft && (
          <Card className="accent stack"><div className="row"><IPlay style={{ width: 22, height: 22 }} /><b>{t('Masz trwający trening')}</b></div><div className="small">{draft.title}</div>
            <button className="btn primary" onClick={() => nav.tab('workout')}>{t('Wróć do treningu')}</button></Card>
        )}

        {!draft && day && day.kind !== 'rest' && (
          <Card className="accent stack">
            <span className="tag teal" style={{ alignSelf: 'flex-start' }}>{doneToday ? t('Dziś już trenowano ✓') : t('Dzisiejszy trening')}</span>
            <h2>{day.title}</h2>
            <p className="small">{day.items.length} {t('ćwiczeń')} · ~{dayMinutes(day)} min</p>
            <button className="btn primary big" onClick={() => { unlockAudio(); void setDraft(draftFromDay(day, plan!.id, ti)); nav.tab('workout'); }}><IPlay />{doneToday ? t('Trenuj ponownie') : t('Rozpocznij')}</button>
          </Card>
        )}
        {!draft && plan && day?.kind === 'rest' && (
          <Card className="stack"><h2>{t('Dziś odpoczynek')}</h2><p className="small muted">{t('Regeneracja też jest treningiem. Jeśli chcesz, zrób lekką mobilność.')}</p>
            <button className="btn" onClick={() => startRoutineWorkout(ROUTINE_BY_ID['r-morning'] ?? Object.values(ROUTINE_BY_ID)[0])}><IStretch />{t('Mobilność (ok. 8 min)')}</button></Card>
        )}
        {!plan && <Card className="stack"><h2>{t('Brak planu')}</h2><button className="btn primary" onClick={() => nav.tab('plan')}>{t('Utwórz plan')}</button></Card>}

        {!draft && plan && day && day.kind !== 'rest' && !doneToday && since !== null && since >= 4 && (
          <Card className="warn stack"><div className="row"><IWarn style={{ width: 22, height: 22, color: 'var(--warn)' }} /><b>{t('Minęło {n} dni od treningu', { n: since })}</b></div>
            <p className="small">{t('Wróć stopniowo — wersja skrócona (ok. 20 min), bez nadrabiania zaległości.')}</p>
            <button className="btn" onClick={() => { unlockAudio(); void setDraft(shortVersion(day, 20, plan.id, ti)); nav.tab('workout'); }}>{t('Zacznij krótką wersję')}</button></Card>
        )}

        <Section title={t('Ten tydzień')}>
          <Card>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              {DAY_SHORT_PL.map((d, i) => {
                const key = dateKey(addDays(weekStart, i));
                const done = doneDates.has(key); const pk = plan?.days[i]?.kind;
                return (<div key={i} className="center" style={{ width: '13%' }} aria-label={`${t(d)}: ${done ? t('wykonano') : pk && pk !== 'rest' ? t('zaplanowano') : t('odpoczynek')}`}>
                  <div className="tiny" style={{ color: i === ti ? 'var(--teal)' : 'var(--faint)', fontWeight: 700 }}>{t(d)}</div>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', margin: '4px auto 0', display: 'grid', placeItems: 'center', background: done ? 'var(--teal)' : 'var(--bg2)', border: `2px solid ${i === ti ? 'var(--teal)' : pk && pk !== 'rest' ? 'var(--line)' : 'transparent'}`, color: 'var(--on-accent)' }}>{done ? <IDone style={{ width: 18, height: 18 }} /> : pk && pk !== 'rest' ? <span style={{ width: 8, height: 8, borderRadius: 4, background: pk === 'mobility' ? 'var(--blue-l)' : 'var(--faint)' }} /> : null}</div>
                </div>);
              })}
            </div>
            <div className="bar" style={{ marginTop: 12 }}><i style={{ width: `${planned ? Math.min(100, (wk.sessions / planned) * 100) : 0}%` }} /></div>
            <div className="small muted" style={{ marginTop: 6 }}>{wk.sessions} / {planned || '—'} {t('treningów')}</div>
          </Card>
        </Section>

        <div className="grid3">
          <Card className="center"><IFlame style={{ color: 'var(--warn)' }} /><div className="bold num" style={{ fontSize: 22 }}>{streak}</div><div className="tiny muted">{t('tyg. z rzędu')}</div></Card>
          <Card className="center"><IActivity style={{ color: 'var(--teal)' }} /><div className="bold num" style={{ fontSize: 22 }}>{wk.sets}</div><div className="tiny muted">{t('serii w tyg.')}</div></Card>
          <Card className="center"><IClock style={{ color: 'var(--blue-l)' }} /><div className="bold num" style={{ fontSize: 22 }}>{Math.round(wk.minutes)}</div><div className="tiny muted">{t('min aktywnie')}</div></Card>
        </div>

        <Section title={t('Szybkie akcje')}>
          <div className="grid2">
            <button className="card btn" onClick={() => nav.push({ name: 'timers' })}><ITimer style={{ color: 'var(--teal)' }} /><div className="bold">{t('Timery')}</div></button>
            <button className="card btn" onClick={() => nav.tab('library')}><IBody style={{ color: 'var(--teal)' }} /><div className="bold">{t('Ćwiczenia i atlas')}</div></button>
            <button className="card btn" onClick={() => nav.push({ name: 'builder', section: 'stretch' })}><IStretch style={{ color: 'var(--teal)' }} /><div className="bold">{t('Rozciąganie')}</div></button>
            <button className="card btn" onClick={() => nav.push({ name: 'builder', section: 'spine' })}><IPosture style={{ color: 'var(--teal)' }} /><div className="bold">{t('Kręgosłup')}</div></button>
            <button className="card btn" onClick={() => nav.tab('progress')}><IActivity style={{ color: 'var(--teal)' }} /><div className="bold">{t('Postępy')}</div></button>
          </div>
        </Section>

        {sessions.length > 0 && (() => { const s = sessions[sessions.length - 1]; return (
          <Section title={t('Ostatni trening')}><Card><b>{s.title}</b><div className="small muted">{s.date} · {fmtClock(s.durationSec)} · {sessionSets(s)} {t('serii')}</div></Card></Section>); })()}

        <p className="tiny faint center">{t('FORM+ nie zastępuje trenera, fizjoterapeuty ani lekarza. Przy bólu przerwij ćwiczenie.')}</p>
      </div>
    </>
  );
}
