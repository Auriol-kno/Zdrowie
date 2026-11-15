import { useEffect } from 'react';
import { getState, init, nav, useStore, type Screen, type Tab } from './core/store';
import { t } from './core/i18n';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { PlanScreen } from './screens/Plan';
import { ExerciseDetail, LibraryScreen } from './screens/Library';
import { WorkoutScreen } from './screens/Workout';
import { ProgressScreen } from './screens/Progress';
import { SettingsScreen } from './screens/Settings';
import { RoutineScreen, TimersScreen } from './screens/Timers';
import { BuilderScreen } from './screens/Builder';
import { Toast } from './ui/components';
import { IHome, ILibrary, IPlan, IProgress, IWorkout } from './ui/icons';

const TABS: { id: Tab; pl: string; Icon: typeof IHome }[] = [
  { id: 'home', pl: 'Pulpit', Icon: IHome }, { id: 'plan', pl: 'Mój plan', Icon: IPlan }, { id: 'library', pl: 'Ćwiczenia', Icon: ILibrary },
  { id: 'workout', pl: 'Trening', Icon: IWorkout }, { id: 'progress', pl: 'Postępy', Icon: IProgress },
];

function applyTheme(mode: 'marble' | 'dark' | 'light' | 'system') {
  const theme = mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'marble' ? '#1e6fd0' : theme === 'dark' ? '#0b1220' : '#f1f5fb');
}

function Overlay({ s }: { s: Screen }) {
  switch (s.name) {
    case 'exercise': return <ExerciseDetail id={s.id} />;
    case 'settings': case 'profile': return <SettingsScreen />;
    case 'timers': return <TimersScreen />;
    case 'builder': return <BuilderScreen section={s.section} />;
    case 'routine': return <RoutineScreen id={s.id} />;
    default: return null;
  }
}

export function App() {
  const ready = useStore((s) => s.ready);
  const settings = useStore((s) => s.settings);
  const tab = useStore((s) => s.tab);
  const stack = useStore((s) => s.stack);
  const draft = useStore((s) => s.draft);
  const toast = useStore((s) => s.toast);

  useEffect(() => { void init(); }, []);
  useEffect(() => {
    applyTheme(settings.theme);
    document.documentElement.lang = settings.lang;
    if (settings.theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)'); const h = () => applyTheme('system');
    mq.addEventListener('change', h); return () => mq.removeEventListener('change', h);
  }, [settings.theme, settings.lang]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && getState().stack.length && !document.querySelector('[role="dialog"]')) nav.pop(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!ready) return <div className="boot">FORM+</div>;
  if (!settings.onboarded) return <Onboarding />;

  return (
    <div className="app" key={settings.lang}>
      <div className="shell" inert={stack.length > 0 ? true : undefined}>
      {tab === 'home' && <Dashboard />}
      {tab === 'plan' && <PlanScreen />}
      {tab === 'library' && <LibraryScreen />}
      {tab === 'workout' && <WorkoutScreen />}
      {tab === 'progress' && <ProgressScreen />}
      <nav className="tabbar" aria-label={t('Nawigacja główna')}>
        {TABS.map(({ id, pl, Icon }) => (
          <button key={id} className={`tab${id === 'workout' && draft ? ' live' : ''}`} aria-current={tab === id && stack.length === 0 ? 'page' : undefined} onClick={() => nav.tab(id)}>
            <Icon />{t(pl)}{id === 'workout' && draft && <span className="sr">{t('Trening w toku')}</span>}
          </button>
        ))}
      </nav>
      </div>
      {stack.map((s, i) => <Overlay key={i} s={s} />)}
      {toast && <Toast msg={toast} onDone={() => nav.toast(null)} />}
    </div>
  );
}
