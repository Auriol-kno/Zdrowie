import { useState } from 'react';
import type { EquipmentId, Gender, GoalId, Level, Limitation, Module, Profile } from '../core/types';
import { EQUIPMENT, GOALS, GYM_EQUIPMENT, HOME_BASIC, LEVELS } from '../data/muscles';
import { generatePlan, newSeed } from '../engine/generator';
import { savePlan, saveProfile, saveSettings } from '../core/store';
import { t } from '../core/i18n';
import { Choice, Chip, Seg, Stepper, TopBar } from '../ui/components';
import { IBody, IShield, ISpark } from '../ui/icons';
import { uid } from '../core/time';

const TOTAL = 9;
const LIMITS: { id: Limitation; pl: string }[] = [
  { id: 'knees', pl: 'Kolana' }, { id: 'back', pl: 'Plecy / kręgosłup' }, { id: 'shoulders', pl: 'Barki' }, { id: 'wrists', pl: 'Nadgarstki' }, { id: 'neck', pl: 'Szyja' },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>({
    name: '', gender: 'na', age: null, heightCm: null, weightKg: null, level: 'beginner', goal: 'fullbody', location: 'gym',
    equipment: GYM_EQUIPMENT, daysPerWeek: 3, minutes: 45, intensity: 'medium', limitations: [], createdAt: Date.now(),
  });
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const setLocation = (loc: Profile['location']) => {
    setP((x) => ({
      ...x, location: loc,
      equipment: loc === 'gym' ? GYM_EQUIPMENT : loc === 'home' ? HOME_BASIC : GYM_EQUIPMENT,
    }));
  };

  const finish = async () => {
    const prefer: Module[] = p.location === 'home' ? ['home', 'kettlebell'] : p.location === 'gym' ? ['gym'] : ['gym', 'home'];
    if (p.equipment.includes('kettlebell') && !prefer.includes('kettlebell') && p.location !== 'gym') prefer.push('kettlebell');
    const plan = generatePlan({
      goal: p.goal, level: p.level, days: p.daysPerWeek, minutes: p.minutes, equipment: p.equipment, location: p.location, preferred: prefer,
      limitations: p.limitations, withWarmup: true, withCooldown: true, withMobilityDays: p.goal === 'mobility' || p.goal === 'flexibility' || p.daysPerWeek <= 4, recentExerciseIds: [], seed: newSeed(),
    }, t('Mój pierwszy plan'));
    plan.id = uid('plan');
    await saveProfile({ ...p, createdAt: Date.now() });
    await savePlan(plan);
    await saveSettings({ activePlanId: plan.id, onboarded: true });
  };

  const next = () => (step === TOTAL - 1 ? void finish() : setStep(step + 1));
  const back = () => setStep(step - 1);
  const genders: { id: Gender; pl: string }[] = [{ id: 'female', pl: 'Kobieta' }, { id: 'male', pl: 'Mężczyzna' }, { id: 'na', pl: 'Wolę nie podawać' }];

  return (
    <div className="app">
      <TopBar title={step === 0 ? <span className="brand">FORM+</span> : t('Twój profil')} onBack={step > 0 ? back : undefined} />
      <div className="main stack" style={{ paddingBottom: 12 }}>
        {step > 0 && <div className="steps" aria-label={t('Krok {n} z {m}', { n: step, m: TOTAL - 1 })}>{Array.from({ length: TOTAL - 1 }, (_, i) => <i key={i} className={i < step ? 'on' : ''} />)}</div>}

        {step === 0 && (<>
          <div className="stack" style={{ paddingTop: 12 }}>
            <div style={{ color: 'var(--teal)', width: 56, height: 56 }}><IBody style={{ width: 56, height: 56 }} /></div>
            <h1>{t('Trening w Twoim tempie')}</h1>
            <p className="muted">{t('Siłownia, dom, kettlebell i mobilność w jednej aplikacji. Biblioteka ćwiczeń z animacjami techniki, timery, plan tygodnia i statystyki — wszystko działa offline, a dane zostają na Twoim urządzeniu.')}</p>
          </div>
          <div className="card warn stack sm">
            <div className="row"><IShield style={{ width: 22, height: 22, color: 'var(--warn)' }} /><h3>{t('Ważne o bezpieczeństwie')}</h3></div>
            <p className="small">{t('FORM+ nie zastępuje trenera, fizjoterapeuty ani lekarza. Przy bólu (innym niż zwykłe zmęczenie mięśni), zawrotach głowy lub urazie przerwij ćwiczenie i skonsultuj się ze specjalistą. Aplikacja nie diagnozuje ani nie leczy.')}</p>
          </div>
          <div className="card flat small muted">{t('Wszystkie pytania są dobrowolne i służą tylko do dopasowania propozycji. Każdą rekomendację możesz zmienić ręcznie.')}</div>
        </>)}

        {step === 1 && (<>
          <h2>{t('Jak mamy się do Ciebie zwracać?')}</h2>
          <div className="field"><label htmlFor="nm">{t('Imię (opcjonalnie)')}</label><input id="nm" className="input" value={p.name} onChange={(e) => set('name', e.target.value)} autoComplete="given-name" /></div>
          <div className="label">{t('Płeć (opcjonalnie)')}</div>
          <p className="small muted">{t('Użyjemy jej tylko do domyślnych akcentów programu (np. więcej pracy na pośladki lub barki). Żadne ćwiczenie nie jest przed nikim zablokowane.')}</p>
          <div className="stack sm">{genders.map((g) => <Choice key={g.id} on={p.gender === g.id} onClick={() => set('gender', g.id)} title={t(g.pl)} />)}</div>
        </>)}

        {step === 2 && (<>
          <h2>{t('Podstawowe dane')}</h2>
          <p className="small muted">{t('Wszystko opcjonalne. Dane zostają na urządzeniu i możesz je usunąć w ustawieniach.')}</p>
          <div className="field"><label>{t('Wiek')}</label><Stepper label={t('Wiek')} value={p.age} onChange={(v) => set('age', v)} min={14} max={99} unit={t('lat')} /></div>
          <div className="field"><label>{t('Wzrost')}</label><Stepper label={t('Wzrost')} value={p.heightCm} onChange={(v) => set('heightCm', v)} min={100} max={230} unit="cm" /></div>
          <div className="field"><label>{t('Masa ciała')}</label><Stepper label={t('Masa ciała')} value={p.weightKg} onChange={(v) => set('weightKg', v)} min={30} max={250} step={0.5} decimals={1} unit="kg" /></div>
          <button className="btn ghost sm" onClick={() => { set('age', null); set('heightCm', null); set('weightKg', null); }}>{t('Wyczyść dane')}</button>
        </>)}

        {step === 3 && (<>
          <h2>{t('Twój poziom')}</h2>
          <div className="stack sm">
            {LEVELS.map((l) => <Choice key={l.id} on={p.level === l.id} onClick={() => set('level', l.id as Level)} title={t(l.pl)}
              sub={l.id === 'beginner' ? t('Do 6 miesięcy regularnych treningów lub dopiero zaczynasz') : l.id === 'intermediate' ? t('Ćwiczysz regularnie od ponad pół roku, znasz podstawowe ruchy') : t('Wieloletnie doświadczenie, dobra technika ćwiczeń złożonych')} />)}
          </div>
        </>)}

        {step === 4 && (<>
          <h2>{t('Główny cel')}</h2>
          <div className="stack sm">{GOALS.map((g) => <Choice key={g.id} on={p.goal === g.id} onClick={() => set('goal', g.id as GoalId)} title={t(g.pl)} />)}</div>
        </>)}

        {step === 5 && (<>
          <h2>{t('Gdzie ćwiczysz?')}</h2>
          <div className="stack sm">
            <Choice on={p.location === 'gym'} onClick={() => setLocation('gym')} title={t('Siłownia')} sub={t('Sztanga, maszyny, wyciągi')} />
            <Choice on={p.location === 'home'} onClick={() => setLocation('home')} title={t('Dom')} sub={t('Mało sprzętu lub wcale')} />
            <Choice on={p.location === 'both'} onClick={() => setLocation('both')} title={t('Dom i siłownia')} />
          </div>
        </>)}

        {step === 6 && (<>
          <h2>{t('Dostępny sprzęt')}</h2>
          <p className="small muted">{t('Plan i wyszukiwarka pokażą tylko ćwiczenia możliwe do wykonania z tym sprzętem. Masa własnego ciała jest zawsze dostępna.')}</p>
          <div className="chips wrap">
            {EQUIPMENT.map((e) => (
              <Chip key={e.id} on={p.equipment.includes(e.id as EquipmentId)} onClick={() => e.id !== 'bodyweight' && set('equipment', toggle(p.equipment, e.id as EquipmentId))}>{t(e.pl)}</Chip>
            ))}
          </div>
        </>)}

        {step === 7 && (<>
          <h2>{t('Plan tygodnia')}</h2>
          <div className="field"><label>{t('Dni treningowe w tygodniu')}</label>
            <Seg value={p.daysPerWeek} onChange={(v) => set('daysPerWeek', v)} options={[2, 3, 4, 5, 6].map((n) => ({ v: n, label: String(n) }))} /></div>
          <div className="field"><label>{t('Czas jednego treningu')}</label>
            <Seg value={p.minutes} onChange={(v) => set('minutes', v)} options={[20, 30, 45, 60, 75].map((n) => ({ v: n, label: `${n} min` }))} /></div>
          <div className="field"><label>{t('Intensywność')}</label>
            <Seg value={p.intensity} onChange={(v) => set('intensity', v)} options={[{ v: 'low', label: t('Lekka') }, { v: 'medium', label: t('Średnia') }, { v: 'high', label: t('Wysoka') }]} /></div>
          <p className="small muted">{t('Początkujący powinni zaczynać od 2–3 dni i zwiększać obciążenie stopniowo.')}</p>
        </>)}

        {step === 8 && (<>
          <h2>{t('Ograniczenia (dobrowolnie)')}</h2>
          <p className="small muted">{t('Zaznacz partie, które chcesz oszczędzać. Aplikacja pominie wtedy część ćwiczeń mocno obciążających tę okolicę. To proste filtrowanie, a nie porada medyczna — przy dolegliwościach skonsultuj się z lekarzem lub fizjoterapeutą.')}</p>
          <div className="chips wrap">{LIMITS.map((l) => <Chip key={l.id} on={p.limitations.includes(l.id)} onClick={() => set('limitations', toggle(p.limitations, l.id))}>{t(l.pl)}</Chip>)}</div>
          <div className="card accent stack sm">
            <div className="row"><ISpark style={{ width: 22, height: 22 }} /><h3>{t('Gotowe!')}</h3></div>
            <p className="small">{t('Na podstawie Twoich odpowiedzi wygenerujemy pierwszy plan tygodnia. To generator regułowy działający na urządzeniu — plan możesz dowolnie edytować lub wygenerować od nowa.')}</p>
          </div>
        </>)}
      </div>
      <div className="dock">
        <button className="btn primary big" onClick={next}>{step === 0 ? t('Zaczynamy') : step === TOTAL - 1 ? t('Utwórz plan') : t('Dalej')}</button>
      </div>
    </div>
  );
}
