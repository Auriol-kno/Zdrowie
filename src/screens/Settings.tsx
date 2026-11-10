import { useRef, useState } from 'react';
import type { Profile, EquipmentId, Gender, GoalId, Level, Limitation } from '../core/types';
import { buildBackup, eraseEverything, importBackup, nav, resetPlans, saveProfile, saveSettings, sessionsToCsv, useStore, getState, validateBackup } from '../core/store';
import { t } from '../core/i18n';
import { EX_BY_ID } from '../data/exercises';
import { EQUIPMENT, GOALS, LEVELS } from '../data/muscles';
import { vibrationSupported, wakeLockSupported } from '../core/audio';
import { Card, Chip, Confirm, Section, Seg, Stepper, Switch, TopBar, download } from '../ui/components';
import { IDownload, IShield, ITrash, IUpload, IOffline } from '../ui/icons';
import { dateKey } from '../core/time';
import { ProfileSheet } from '../ui/ProfileSwitcher';
import { currentSlot } from '../core/store';

const LIMITS: { id: Limitation; pl: string }[] = [{ id: 'knees', pl: 'Kolana' }, { id: 'back', pl: 'Plecy' }, { id: 'shoulders', pl: 'Barki' }, { id: 'wrists', pl: 'Nadgarstki' }, { id: 'neck', pl: 'Szyja' }];

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const profile = useStore((s) => s.profile);
  const [confirm, setConfirm] = useState<null | 'erase' | 'plans'>(null);
  const [edit, setEdit] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = saveSettings;

  const exportJson = () => { download(`formplus-${dateKey()}.json`, JSON.stringify(buildBackup(getState()), null, 1), 'application/json'); nav.toast(t('Wyeksportowano kopię zapasową')); };
  const exportCsv = () => { download(`formplus-historia-${dateKey()}.csv`, '﻿' + sessionsToCsv(getState().sessions, (id) => EX_BY_ID[id]?.pl ?? id), 'text/csv;charset=utf-8'); };
  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!validateBackup(data)) throw new Error('format');
      await importBackup(data); nav.toast(t('Zaimportowano dane: {n} treningów', { n: data.sessions.length }));
    } catch { nav.toast(t('Nie udało się zaimportować — to nie jest poprawny plik kopii FORM+.')); }
    if (file.current) file.current.value = '';
  };

  return (
    <div className="overlay">
      <TopBar title={t('Ustawienia')} onBack={nav.pop} />
      <div className="main stack">
        <Section title={t('Profil')}>
          <Card className="stack sm">
            {profile ? <><b>{profile.name || t('Bez imienia')}</b><div className="small muted">{t(LEVELS.find((l) => l.id === profile.level)!.pl)} · {t(GOALS.find((g) => g.id === profile.goal)!.pl)} · {profile.daysPerWeek}× {t('tydz.')} · {profile.minutes} min</div></> : <span className="muted">{t('Brak profilu')}</span>}
            {profile && <button className="btn" onClick={() => setEdit(true)}>{t('Edytuj profil')}</button>}
            <button className="btn" onClick={() => setSwitcher(true)}>{t('Zmień profil')} ({currentSlot() + 1}/3)</button>
            <p className="tiny faint">{t('Rekomendacje (plan, sprzęt) są tylko propozycjami — możesz je zmienić ręcznie w dowolnym momencie.')}</p>
          </Card>
        </Section>

        <Section title={t('Wygląd i język')}>
          <Card className="stack">
            <div className="field"><label>{t('Motyw')}</label><Seg value={settings.theme} onChange={(v) => void set({ theme: v })} options={[{ v: 'marble', label: t('Kulki') }, { v: 'dark', label: t('Ciemny') }, { v: 'light', label: t('Jasny') }, { v: 'system', label: t('Systemowy') }]} /></div>
            <div className="field"><label>{t('Język')}</label><Seg value={settings.lang} onChange={(v) => void set({ lang: v })} options={[{ v: 'pl', label: 'Polski' }, { v: 'en', label: 'English' }]} /></div>
            {settings.lang === 'en' && <p className="tiny faint">Interface is translated; exercise descriptions are currently available in Polish only.</p>}
          </Card>
        </Section>

        <Section title={t('Trening i timery')}>
          <Card>
            <Switch checked={settings.sound} onChange={(v) => void set({ sound: v })} label={t('Dźwięki')} />
            <Switch checked={settings.vibrate} onChange={(v) => void set({ vibrate: v })} label={t('Wibracje')} sub={vibrationSupported() ? undefined : t('Niedostępne w tej przeglądarce (np. iOS Safari)')} />
            <Switch checked={settings.voice} onChange={(v) => void set({ voice: v })} label={t('Komunikaty głosowe')} sub={t('Syntezator mowy urządzenia')} />
            <Switch checked={settings.autoRest} onChange={(v) => void set({ autoRest: v })} label={t('Automatyczna przerwa po serii')} />
            <p className="tiny faint">{wakeLockSupported() ? t('Ekran nie wygaśnie podczas treningu i timerów.') : t('Ta przeglądarka nie pozwala blokować wygaszania ekranu — ustaw dłuższe wygaszanie w systemie.')} {t('Przeglądarki wstrzymują aplikacje w tle; timer pokaże poprawny czas po powrocie, ale dźwięk w tle nie jest gwarantowany.')}</p>
          </Card>
        </Section>

        <Section title={t('Dane i kopia zapasowa')}>
          <Card className="stack">
            <p className="small muted">{t('Wszystkie dane (profil, plany, historia, pomiary) są przechowywane lokalnie na tym urządzeniu w IndexedDB. Dane o zdrowiu i ciele są wrażliwe — nie wysyłamy ich nigdzie.')}</p>
            <button className="btn" onClick={exportJson}><IDownload />{t('Eksport JSON (pełna kopia)')}</button>
            <button className="btn" onClick={exportCsv}><IDownload />{t('Eksport CSV (historia serii)')}</button>
            <button className="btn" onClick={() => file.current?.click()}><IUpload />{t('Import kopii JSON')}</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} aria-label={t('Plik kopii')} />
            <button className="btn danger" onClick={() => setConfirm('plans')}>{t('Zresetuj plany')}</button>
            <button className="btn danger" onClick={() => setConfirm('erase')}><ITrash />{t('Usuń dane tego profilu')}</button>
          </Card>
        </Section>

        <Section title={t('Synchronizacja i zdrowie')}>
          <Card className="stack sm">
            <div className="row"><IOffline style={{ width: 20, height: 20 }} /><b>{t('Synchronizacja w chmurze: wyłączona')}</b></div>
            <p className="small muted">{t('W tej wersji aplikacja działa w pełni offline i nie ma konta ani serwera. Architektura przewiduje opcjonalny adapter synchronizacji (np. Supabase), ale nie jest on zaimplementowany — dlatego nie udajemy synchronizacji. Do przenoszenia danych służy eksport/import JSON.')}</p>
            <p className="small muted">{t('Apple Health / HealthKit: aplikacja webowa (PWA) nie ma dostępu do HealthKit, więc integracji nie ma. Nie symulujemy jej.')}</p>
          </Card>
        </Section>

        <Section title={t('Instalacja')}>
          <Card><p className="small muted">{t('iPhone: Safari → Udostępnij → „Do ekranu początkowego”. Android/Chrome: menu → „Zainstaluj aplikację”. Po pierwszym wczytaniu aplikacja działa offline.')}</p></Card>
        </Section>

        <Card className="warn stack sm">
          <div className="row"><IShield style={{ width: 22, height: 22, color: 'var(--warn)' }} /><b>{t('Bezpieczeństwo treningu')}</b></div>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li>{t('FORM+ nie zastępuje trenera, fizjoterapeuty ani lekarza i nie stawia diagnoz.')}</li>
            <li>{t('Zwiększaj obciążenie stopniowo (zwykle nie więcej niż ok. 5% naraz).')}</li>
            <li>{t('Zmęczenie mięśni jest normalne; ostry, kłujący ból, drętwienie lub zawroty głowy — przerwij i skonsultuj się ze specjalistą.')}</li>
            <li>{t('Rozciągaj do łagodnego napięcia, nigdy przez ból.')}</li>
            <li>{t('Przy chorobach, urazach, ciąży lub leczeniu porozmawiaj z lekarzem przed rozpoczęciem treningu.')}</li>
          </ul>
        </Card>
        <p className="tiny faint center">FORM+ v1.0 · {t('dane tylko na Twoim urządzeniu')}</p>
      </div>
      {switcher && <ProfileSheet onClose={() => setSwitcher(false)} />}
      {confirm === 'erase' && <Confirm danger title={t('Usunąć dane tego profilu?')} text={t('Plany, historia i pomiary tego profilu zostaną trwale usunięte z urządzenia. Pozostałe profile nie zostaną zmienione. Zrób najpierw eksport, jeśli chcesz zachować kopię.')} confirmLabel={t('Usuń wszystko')} onNo={() => setConfirm(null)} onYes={() => { setConfirm(null); void eraseEverything(); }} />}
      {confirm === 'plans' && <Confirm danger title={t('Zresetować plany?')} text={t('Wszystkie plany zostaną usunięte. Historia treningów pozostanie.')} confirmLabel={t('Zresetuj')} onNo={() => setConfirm(null)} onYes={() => { setConfirm(null); void resetPlans(); nav.toast(t('Plany usunięte')); }} />}
      {edit && profile && <ProfileEditor p={profile} onClose={() => setEdit(false)} />}
    </div>
  );
}

function ProfileEditor({ p, onClose }: { p: Profile; onClose: () => void }) {
  const [x, setX] = useState(p);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setX((o) => ({ ...o, [k]: v }));
  const tog = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((y) => y !== v) : [...a, v]);
  return (
    <div className="overlay" style={{ zIndex: 30 }}>
      <TopBar title={t('Edytuj profil')} onBack={onClose} />
      <div className="main stack">
        <div className="field"><label htmlFor="pn">{t('Imię')}</label><input id="pn" className="input" value={x.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field"><label>{t('Płeć (opcjonalnie)')}</label><Seg value={x.gender} onChange={(v) => set('gender', v as Gender)} options={[{ v: 'female', label: t('Kobieta') }, { v: 'male', label: t('Mężczyzna') }, { v: 'na', label: t('Nie podaję') }]} /></div>
        <div className="field"><label>{t('Wiek')}</label><Stepper label={t('Wiek')} value={x.age} min={14} max={99} onChange={(v) => set('age', v)} /></div>
        <div className="field"><label>{t('Wzrost (cm)')}</label><Stepper label={t('Wzrost')} value={x.heightCm} min={100} max={230} onChange={(v) => set('heightCm', v)} /></div>
        <div className="field"><label>{t('Masa ciała (kg)')}</label><Stepper label={t('Masa ciała')} value={x.weightKg} min={30} max={250} step={0.5} decimals={1} onChange={(v) => set('weightKg', v)} /></div>
        <div className="field"><label>{t('Poziom')}</label><Seg value={x.level} onChange={(v) => set('level', v as Level)} options={LEVELS.map((l) => ({ v: l.id as Level, label: t(l.pl.split(' ')[0]) }))} /></div>
        <div className="field"><label>{t('Cel')}</label><div className="chips wrap">{GOALS.map((g) => <Chip key={g.id} on={x.goal === g.id} onClick={() => set('goal', g.id as GoalId)}>{t(g.pl)}</Chip>)}</div></div>
        <div className="field"><label>{t('Miejsce')}</label><Seg value={x.location} onChange={(v) => set('location', v)} options={[{ v: 'gym', label: t('Siłownia') }, { v: 'home', label: t('Dom') }, { v: 'both', label: t('Oba') }]} /></div>
        <div className="field"><label>{t('Sprzęt')}</label><div className="chips wrap">{EQUIPMENT.map((e) => <Chip key={e.id} on={x.equipment.includes(e.id as EquipmentId)} onClick={() => e.id !== 'bodyweight' && set('equipment', tog(x.equipment, e.id as EquipmentId))}>{t(e.pl)}</Chip>)}</div></div>
        <div className="field"><label>{t('Dni w tygodniu')}</label><Seg value={x.daysPerWeek} onChange={(v) => set('daysPerWeek', v)} options={[2, 3, 4, 5, 6].map((n) => ({ v: n, label: String(n) }))} /></div>
        <div className="field"><label>{t('Czas treningu')}</label><Seg value={x.minutes} onChange={(v) => set('minutes', v)} options={[20, 30, 45, 60, 75].map((n) => ({ v: n, label: `${n}'` }))} /></div>
        <div className="field"><label>{t('Intensywność')}</label><Seg value={x.intensity} onChange={(v) => set('intensity', v)} options={[{ v: 'low', label: t('Lekka') }, { v: 'medium', label: t('Średnia') }, { v: 'high', label: t('Wysoka') }]} /></div>
        <div className="field"><label>{t('Oszczędzaj (dobrowolnie)')}</label><div className="chips wrap">{LIMITS.map((l) => <Chip key={l.id} on={x.limitations.includes(l.id)} onClick={() => set('limitations', tog(x.limitations, l.id))}>{t(l.pl)}</Chip>)}</div></div>
        <button className="btn primary big" onClick={() => { void saveProfile(x); onClose(); nav.toast(t('Profil zapisany')); }}>{t('Zapisz')}</button>
      </div>
    </div>
  );
}
