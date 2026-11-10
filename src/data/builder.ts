// Sekcje „Kręgosłup” i „Rozciąganie”: własny wybór ćwiczeń, konfiguracja serii oraz zapisane zestawy.
import type { Exercise, MuscleId, PostureExCfg, SectionId } from '../core/types';
import { EXERCISES, getEx } from './exercises';
import { ROUTINE_BY_ID } from './routines';
import { POSTURE_CATALOG, catalogFor as spineCatalog, isAvoided as spineAvoided, recommendedIds as spineRec } from './posture';
import { cfgToItem } from './posture';

export interface BEntry { id: string; rec: boolean; note?: string; avoid?: boolean }
export interface FilterOpt { v: string; pl: string }

export interface SectionDef {
  id: SectionId;
  pl: string;
  sub: string;
  filters: FilterOpt[];
  info: (f: string) => string;
  disclaimerTitle: string;
  disclaimer: string;
  catalog: (f: string) => BEntry[];
  recommended: (f: string) => string[];
  avoidedLabel: (f: string) => string | null;
}

const AREAS: Record<string, MuscleId[]> = {
  hips: ['hip_flexors', 'glutes', 'adductors'],
  back: ['lower_back', 'mid_back', 'lats', 'obliques', 'abs'],
  legs: ['quads', 'hamstrings', 'calves'],
  upper: ['neck', 'traps', 'front_delts', 'side_delts', 'rear_delts', 'chest', 'biceps', 'triceps', 'forearms'],
};
export function stretchArea(e: Exercise): string {
  if (e.stretchType === 'breathing') return 'breath';
  const m = e.primary[0];
  return Object.keys(AREAS).find((k) => AREAS[k].includes(m)) ?? 'back';
}
const STRETCH_ALL = EXERCISES.filter((e) => e.module === 'mobility');
const stretchList = (f: string) => STRETCH_ALL.filter((e) => f === 'all' || stretchArea(e) === f);
const FULL_BODY = new Set(ROUTINE_BY_ID['r-full']?.steps.map((s) => s.exId) ?? []);

export const SECTIONS: Record<SectionId, SectionDef> = {
  spine: {
    id: 'spine', pl: 'Kręgosłup', sub: 'Lordoza i skolioza: wybierz ćwiczenia, ustaw serie, powtórzenia i czas',
    filters: [{ v: 'all', pl: 'Wszystkie' }, { v: 'lordosis', pl: 'Lordoza' }, { v: 'scoliosis', pl: 'Skolioza' }],
    info: (f) => ({
      all: 'Zestaw ogólny: stabilizacja tułowia, kontrola miednicy i łopatek.',
      lordosis: 'Pogłębiona lordoza lędźwiowa często idzie w parze ze skróconymi zginaczami biodra i prostownikami grzbietu oraz osłabionym brzuchem i pośladkami. Ćwiczenia uczą kontroli miednicy, wzmacniają brzuch i pośladki, rozluźniają przód biodra.',
      scoliosis: 'Skolioza jest zróżnicowana (łuk, strona, stopień). Ćwiczenia ogólne poprawiają kontrolę postawy, oddech i siłę mięśni tułowia, ale NIE zastępują terapii prowadzonej przez fizjoterapeutę. Strony i dawki ustal indywidualnie.',
    } as Record<string, string>)[f] ?? '',
    disclaimerTitle: 'To nie jest terapia ani diagnoza',
    disclaimer: 'Ćwiczenia mają charakter ogólny. Przy rozpoznanej skoliozie lub bólu pleców skonsultuj plan z fizjoterapeutą lub lekarzem. Przerwij przy bólu, drętwieniu lub mrowieniu. Jeśli dostałeś(-aś) inne zalecenia (strona, dawka), trzymaj się ich.',
    catalog: (f) => spineCatalog(f as never).map((e) => ({ id: e.id, rec: e.rec, note: e.note, avoid: spineAvoided(e.id, f as never) })),
    recommended: (f) => spineRec(f as never),
    avoidedLabel: (f) => (f === 'lordosis' ? 'niewskazane przy lordozie' : null),
  },
  stretch: {
    id: 'stretch', pl: 'Rozciąganie', sub: 'Wybierz pozycje, ustaw czas utrzymania i serie, zapisz własne zestawy',
    filters: [{ v: 'all', pl: 'Wszystkie' }, { v: 'hips', pl: 'Biodra' }, { v: 'back', pl: 'Plecy i tułów' }, { v: 'legs', pl: 'Nogi' }, { v: 'upper', pl: 'Kark i ramiona' }, { v: 'breath', pl: 'Oddech' }],
    info: () => 'Rozciągaj do wyraźnego, ale komfortowego napięcia — nigdy do bólu. Pozycje statyczne utrzymuj 20–40 s, dynamiczne wykonuj płynnie.',
    disclaimerTitle: 'Rozciągaj bez bólu',
    disclaimer: 'Nie rozciągaj zimnych mięśni — zacznij od krótkiej rozgrzewki. Przy ostrym bólu, drętwieniu lub mrowieniu przerwij ćwiczenie. Przy kontuzji skonsultuj się z lekarzem lub fizjoterapeutą.',
    catalog: (f) => stretchList(f).map((e) => ({ id: e.id, rec: recFor(f).includes(e.id) })),
    recommended: (f) => recFor(f),
    avoidedLabel: () => null,
  },
};

function recFor(f: string): string[] {
  const list = stretchList(f);
  if (f === 'all') return list.filter((e) => FULL_BODY.has(e.id)).map((e) => e.id);
  return list.filter((e) => e.stretchType !== 'dynamic').slice(0, 5).map((e) => e.id);
}

export const SECTION_IDS: SectionId[] = ['spine', 'stretch'];
export const knownIds = (s: SectionId): string[] => (s === 'spine' ? POSTURE_CATALOG.map((e) => e.id) : STRETCH_ALL.map((e) => e.id)).filter((id) => !!getEx(id));

export function sessionTitle(s: SectionId) { return SECTIONS[s].pl; }
export function itemsOf(cfgs: { id: string; cfg: PostureExCfg }[]) { return cfgs.map((c) => cfgToItem(c.id, c.cfg)); }
