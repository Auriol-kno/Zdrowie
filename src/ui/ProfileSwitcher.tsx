import { useEffect, useState } from 'react';
import { PROFILE_SLOTS } from '../core/db';
import { currentSlot, listProfiles, nav, switchProfile, useStore, type ProfileSlotInfo } from '../core/store';
import { t } from '../core/i18n';
import { Sheet } from './components';
import { ICheck } from './icons';

/** Przycisk w nagłówku: pokazuje aktywny profil i otwiera wybór spośród 3 profili. */
export function ProfileButton() {
  const profile = useStore((s) => s.profile);
  const [open, setOpen] = useState(false);
  const slot = currentSlot();
  const name = profile?.name?.trim() || `${t('Profil')} ${slot + 1}`;
  return (
    <>
      <button className="chip profile-pill" onClick={() => setOpen(true)} aria-label={`${t('Zmień profil')}: ${name}`} aria-haspopup="dialog">
        <span className="pnum" aria-hidden="true">{slot + 1}</span><span className="pname">{name}</span>
      </button>
      {open && <ProfileSheet onClose={() => setOpen(false)} />}
    </>
  );
}

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<ProfileSlotInfo[] | null>(null);
  const active = currentSlot();
  useEffect(() => { void listProfiles().then(setList); }, []);
  const pick = async (n: number) => {
    onClose();
    if (n !== active) { await switchProfile(n); nav.toast(t('Przełączono profil {n}', { n: n + 1 })); }
  };
  return (
    <Sheet title={t('Profile')} onClose={onClose}>
      <div className="stack sm" role="radiogroup" aria-label={t('Profile')}>
        {Array.from({ length: PROFILE_SLOTS }, (_, i) => {
          const info = list?.find((x) => x.slot === i);
          if (!list) return <div key={i} className="list-item" aria-busy="true"><span className="pnum big" aria-hidden="true">{i + 1}</span><span className="grow muted">…</span></div>;
          const used = !!info && (info.onboarded || !!info.name);
          return (
            <button key={i} className="list-item" role="radio" aria-checked={i === active} onClick={() => void pick(i)}>
              <span className="pnum big" aria-hidden="true">{i + 1}</span>
              <span className="grow">
                <div className="bold">{used ? (info!.name || t('Bez imienia')) : t('Wolny profil')}</div>
                <div className="small muted">{used ? `${info!.sessions} ${t('treningów w historii')}` : t('Dotknij, aby utworzyć nowy profil')}</div>
              </span>
              {i === active && <ICheck style={{ color: 'var(--teal)' }} />}
            </button>
          );
        })}
        <p className="tiny faint">{t('Każdy profil ma osobne plany, historię, pomiary i ustawienia ćwiczeń. Dane zostają na tym urządzeniu.')}</p>
      </div>
    </Sheet>
  );
}
