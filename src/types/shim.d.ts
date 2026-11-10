// Tymczasowy shim: w środowisku budowania brak @types/react. Po `npm i -D @types/react @types/react-dom`
// usuń ten plik i użyj tsconfig.json — wtedy typy komponentów UI są sprawdzane w pełni.
declare module 'react' {
  export type ReactNode = any;
  export namespace React { type KeyboardEvent = any; type ReactNode = any; }
  export type KeyboardEvent = any;
  export function useState<T>(i: T | (() => T)): [T, (v: T | ((p: T) => T)) => void];
  export function useState<T = undefined>(): [T | undefined, (v: T | undefined) => void];
  export function useEffect(f: () => void | (() => void), d?: any[]): void;
  export function useMemo<T>(f: () => T, d: any[]): T;
  export function useRef<T = any>(i?: T | null): { current: T | null } & { current: any };
  export function useSyncExternalStore<T>(s: (cb: () => void) => () => void, g: () => T, ss?: () => T): T;
}
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare module 'react-dom/client' { export function createRoot(e: any): { render(n: any): void }; }
declare module 'react-icons/lu' { export const Lucide: any; export const LuHouse: any; export const LuCalendarDays: any; export const LuBookOpen: any; export const LuDumbbell: any; export const LuChartLine: any; export const LuSettings: any; export const LuPlay: any; export const LuPause: any; export const LuTimer: any; export const LuSearch: any; export const LuPlus: any; export const LuMinus: any; export const LuCheck: any; export const LuX: any; export const LuChevronRight: any; export const LuChevronLeft: any; export const LuArrowLeft: any; export const LuFlame: any; export const LuTarget: any; export const LuTrophy: any; export const LuClock: any; export const LuSkipForward: any; export const LuRotateCcw: any; export const LuTrash2: any; export const LuCopy: any; export const LuDownload: any; export const LuUpload: any; export const LuSun: any; export const LuMoon: any; export const LuInfo: any; export const LuTriangleAlert: any; export const LuSparkles: any; export const LuPersonStanding: any; export const LuActivity: any; export const LuHeartPulse: any; export const LuStretchHorizontal: any; export const LuFilter: any; export const LuPencil: any; export const LuUser: any; export const LuChevronDown: any; export const LuChevronUp: any; export const LuArrowUp: any; export const LuArrowDown: any; export const LuVolume2: any; export const LuLayers: any; export const LuRepeat: any; export const LuStar: any; export const LuWifiOff: any; export const LuShieldAlert: any; export const LuFileText: any; export const LuCircleCheck: any; export const LuCalendarCheck: any; export const LuZap: any; export const LuScale: any; export const LuSpline: any; }
declare namespace JSX { interface IntrinsicElements { [k: string]: any } interface IntrinsicAttributes { key?: any } }
declare namespace React { type KeyboardEvent = any; type ReactNode = any; }
declare module '*.css';
