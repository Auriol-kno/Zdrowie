// Lekki system tłumaczeń: kluczem jest polski tekst, t("Polski tekst {x}", {x: 1}).
// Brak wpisu w EN → fallback na polski (aplikacja nigdy nie pokazuje pustego tekstu).
// Treść ćwiczeń (kroki, wskazówki, bezpieczeństwo) jest dostępna tylko po polsku — ograniczenie wersji 1.
import { getState } from './store';
import { EN } from './en';

export function t(pl: string, vars?: Record<string, string | number>): string {
  const lang = getState().settings.lang;
  let s = lang === 'en' ? EN[pl] ?? pl : pl;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export const isEn = () => getState().settings.lang === 'en';
