import type { Gender, MuscleId } from '../core/types';
import { BACK, FRONT, SILHOUETTE, type AtlasView } from '../data/atlasShapes';
import { MUSCLES } from '../data/muscles';
import { t } from '../core/i18n';

interface Props {
  view: AtlasView;
  gender?: Gender;
  selected?: MuscleId | null;
  primary?: MuscleId[];
  secondary?: MuscleId[];
  onSelect?: (m: MuscleId) => void;
  height?: number;
}

/** Sylwetka: kobieta = szersze biodra / węższe barki, mężczyzna = odwrotnie (tylko proporcje, bez ograniczania ćwiczeń). */
function scales(g: Gender | undefined) {
  if (g === 'female') return { up: 0.94, lo: 1.07 };
  if (g === 'male') return { up: 1.07, lo: 0.97 };
  return { up: 1, lo: 1 };
}
const around = (sx: number) => `translate(100 0) scale(${sx} 1) translate(-100 0)`;
const mirror = 'translate(200 0) scale(-1 1)';

export function MuscleMap({ view, gender, selected, primary = [], secondary = [], onSelect, height }: Props) {
  const shapes = view === 'front' ? FRONT : BACK;
  const sc = scales(gender);
  const hasHighlight = primary.length > 0 || secondary.length > 0;
  const cls = (id: MuscleId) => {
    if (selected === id) return 'm sel';
    if (primary.includes(id)) return 'm pri';
    if (secondary.includes(id)) return 'm sec';
    return hasHighlight ? 'm dim' : 'm';
  };
  const interactive = !!onSelect;

  const render = (lower: boolean) =>
    (Object.keys(shapes) as MuscleId[]).filter((id) => MUSCLES[id].lower === lower).map((id) =>
      shapes[id]!.map((d, i) => (
        [false, true].map((m) => (
          <path
            key={`${id}-${i}-${m}`} d={d} className={cls(id)} transform={m ? mirror : undefined}
            {...(interactive ? {
              role: 'button', tabIndex: m ? -1 : 0, 'aria-label': t(MUSCLES[id].pl), 'aria-pressed': selected === id,
              onClick: () => onSelect!(id),
              onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect!(id); } },
            } : { 'aria-hidden': true })}
          >
            <title>{t(MUSCLES[id].pl)}</title>
          </path>
        ))
      )));

  return (
    <div className="atlas">
      <svg viewBox="0 0 200 400" style={height ? { maxHeight: height } : undefined} role="group" aria-label={view === 'front' ? t('Sylwetka — widok z przodu') : t('Sylwetka — widok z tyłu')}>
        <g transform={around(sc.up)}>
          <circle cx="100" cy="28" r="19" className="body" />
          <g className="body">{SILHOUETTE.slice(0, 2).map((d, i) => <path key={i} d={d} />)}{SILHOUETTE.slice(0, 2).map((d, i) => <path key={`m${i}`} d={d} transform={mirror} />)}</g>
          {render(false)}
        </g>
        <g transform={around(sc.lo)}>
          <g className="body">{<path d={SILHOUETTE[2]} />}{<path d={SILHOUETTE[2]} transform={mirror} />}</g>
          {render(true)}
        </g>
      </svg>
    </div>
  );
}

export function AtlasLegend() {
  return (
    <div className="legend">
      <span><i style={{ background: 'var(--teal)' }} />{t('Mięsień główny')}</span>
      <span><i style={{ background: 'var(--blue)' }} />{t('Mięsień pomocniczy')}</span>
      <span><i style={{ background: 'var(--card2)', border: '1px solid var(--line)' }} />{t('Pozostałe')}</span>
    </div>
  );
}
