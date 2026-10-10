import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type AppThemeMode = 'light' | 'dark';

// Dark surfaces deliberately stay navy rather than true black, so tables and
// panels retain depth while the existing blue/purple/green/amber accents stay recognisable.
export const darkPalette = {
  page: '#18365F',
  header: '#102D55',
  surface: '#204574',
  surfaceRaised: '#244A78',
  table: '#17365C',
  tableAlternate: '#1C3D66',
  border: '#41658F',
  heading: '#F1F6FF',
  bodyText: '#F1F6FF',
  mutedText: '#C1D2E8',
  scrollbarTrack: '#0D2744',
  scrollbarThumb: '#587694',
  scrollbarThumbHover: '#7899BB',
  overlayWash: '#123B70',
} as const;

type AppThemeContextValue = {
  mode: AppThemeMode;
  isDark: boolean;
  ready: boolean;
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
};

const THEME_PREFERENCE_KEY = 'blueant.themeMode';
const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const readWebPreference = (): AppThemeMode | null => {
  try {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : null;
  } catch {
    return null;
  }
};

const persistPreference = async (mode: AppThemeMode) => {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(THEME_PREFERENCE_KEY, mode);
    } catch {
      // A blocked browser storage should not prevent switching the visible theme.
    }
    return;
  }

  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, mode);
};

function WebDarkModeStyles({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    document.documentElement.dataset.blueantTheme = enabled ? 'dark' : 'light';
    let style = document.getElementById('blueant-dark-theme-adaptation') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'blueant-dark-theme-adaptation';
      document.head.appendChild(style);
    }

    style.textContent = `
      html[data-blueant-theme="dark"], html[data-blueant-theme="dark"] body {
        background: ${darkPalette.page};
        color-scheme: dark;
      }
      html[data-blueant-theme="dark"] #root {
        min-height: 100vh;
        background: ${darkPalette.page};
        /* Full inversion preserves foreground/background contrast for the app's
           existing light-mode pairs, while the hue adjustment retains brand accents. */
        filter: invert(1) hue-rotate(180deg) saturate(.82) brightness(.98);
        transition: filter 180ms ease, background-color 180ms ease;
        isolation: isolate;
      }
      /* Do not put a screen-wide blue wash over the app. It flattens cards and
         table rows; the transformed source colours already provide the deep,
         crisp navy contrast used by the approved Verified Meetings reference. */
      html[data-blueant-theme="dark"] #root img {
        filter: invert(1) hue-rotate(180deg);
      }
      /* The header logo is a brand asset, not a dark-theme surface. Reverse
         the root transformation so its supplied cyan/pink artwork is exact. */
      html[data-blueant-theme="dark"] #blueant-app-logo {
        filter: brightness(1.020408) saturate(1.219512) hue-rotate(180deg) invert(1) !important;
      }
      /* Keep the splash palette intentional rather than washing it out through
         the app-wide adaptation. */
      html[data-blueant-theme="dark"] #blueant-splash {
        filter: invert(1) hue-rotate(180deg) saturate(1.22) brightness(1.02);
      }
      /* Authentication remains in its approved original visual design. */
      html[data-blueant-theme="dark"] #blueant-login {
        /* This selector is intentionally empty on its own: the parent root is
           opted out below, so the login palette stays exactly as designed. */
      }
      /* Login is a light, branded experience—not an authenticated dark-mode
         surface.  Do not transform it or put the navy wash over it. */
      html[data-blueant-theme="dark"] #root:has(#blueant-login) {
        filter: none;
        background: transparent;
      }
      html[data-blueant-theme="dark"] body:has(#blueant-login)::after {
        display: none;
      }
      /* Modal cards are portals, so only their visual card gets adapted. This
         avoids applying a filter to the fixed portal container itself. */
      html[data-blueant-theme="dark"] #blueant-workflow-modal {
        filter: invert(1) hue-rotate(180deg) saturate(.82) brightness(.98);
        position: relative;
        isolation: isolate;
      }
      html[data-blueant-theme="dark"] #blueant-workflow-modal::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 2147483000;
        pointer-events: none;
        background: ${darkPalette.surface};
        mix-blend-mode: screen;
        opacity: .94;
      }
      html[data-blueant-theme="dark"] #blueant-workflow-modal img {
        filter: invert(1) hue-rotate(180deg);
      }
      /* Header menus are rendered in portals, outside #root. Give those
         surfaces the same crisp navy conversion as the authenticated shell. */
      html[data-blueant-theme="dark"] #blueant-navigation-menu,
      html[data-blueant-theme="dark"] #blueant-profile-card {
        filter: invert(1) hue-rotate(180deg) saturate(.82) brightness(.98);
      }
      /* Native browser selects do not inherit a parent filter consistently.
         Counter-filter the control itself, then provide explicit dark values. */
      html[data-blueant-theme="dark"] #blueant-workflow-modal select {
        filter: invert(1) hue-rotate(180deg) saturate(1.22) brightness(1.02);
        background-color: #132A46 !important;
        border-color: #3B5E85 !important;
        color: #E6F0FF !important;
      }
      html[data-blueant-theme="dark"] #blueant-workflow-modal select option {
        background-color: #132A46;
        color: #E6F0FF;
      }
      html[data-blueant-theme="dark"] #blueant-sales-meeting-form select {
        filter: invert(1) hue-rotate(180deg) saturate(1.22) brightness(1.02);
        background-color: #132A46 !important;
        border-color: #3B5E85 !important;
        color: #E6F0FF !important;
      }
      html[data-blueant-theme="dark"] #blueant-sales-meeting-form select option {
        background-color: #132A46;
        color: #E6F0FF;
      }
      /* Browser selects do not reliably inherit the transformed React Native
         view. Counter the parent conversion and supply deliberate navy values. */
      html[data-blueant-theme="dark"] #root select {
        filter: brightness(1.020408) saturate(1.219512) hue-rotate(180deg) invert(1) !important;
        background-color: #0E2949 !important;
        border-color: #41658F !important;
        color: #F1F6FF !important;
      }
      html[data-blueant-theme="dark"] #root select option {
        background-color: #0E2949;
        color: #F1F6FF;
      }
      html[data-blueant-theme="dark"] #root *, html[data-blueant-theme="dark"] #blueant-workflow-modal * {
        scrollbar-color: #9FB4CA #E3EBF5;
      }
      html[data-blueant-theme="dark"] #root *::-webkit-scrollbar {
        width: 11px;
        height: 11px;
      }
      html[data-blueant-theme="dark"] #root *::-webkit-scrollbar-track {
        background: #E3EBF5;
        border-radius: 999px;
      }
      html[data-blueant-theme="dark"] #root *::-webkit-scrollbar-thumb {
        background: #9FB4CA;
        border: 2px solid #E3EBF5;
        border-radius: 999px;
      }
      html[data-blueant-theme="dark"] #root *::-webkit-scrollbar-thumb:hover {
        background: #7F9CB9;
      }
      /* Modal scrollbar sits inside an already filtered surface. These source
         values resolve to a muted navy track and slate thumb after filtering. */
      html[data-blueant-theme="dark"] #blueant-workflow-modal * {
        scrollbar-color: #9FB4CA #E3EBF5;
      }
      html[data-blueant-theme="dark"] #blueant-workflow-modal *::-webkit-scrollbar-track {
        background: #E3EBF5;
      }
      html[data-blueant-theme="dark"] #blueant-workflow-modal *::-webkit-scrollbar-thumb {
        background: #9FB4CA;
        border-color: #E3EBF5;
      }
      html[data-blueant-theme="dark"] #blueant-workflow-modal *::-webkit-scrollbar-thumb:hover {
        background: #7F9CB9;
      }
      @media (prefers-reduced-motion: reduce) {
        html[data-blueant-theme="dark"] #root { transition: none; }
      }
    `;
  }, [enabled]);

  return null;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<AppThemeMode>(() => readWebPreference() ?? 'light');
  const [ready, setReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    void SecureStore.getItemAsync(THEME_PREFERENCE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === 'dark' || stored === 'light') setModeState(stored);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const setMode = (nextMode: AppThemeMode) => {
    setModeState(nextMode);
    void persistPreference(nextMode);
  };

  const value = useMemo<AppThemeContextValue>(() => ({
    mode,
    isDark: mode === 'dark',
    ready,
    setMode,
    toggleMode: () => setMode(mode === 'dark' ? 'light' : 'dark'),
  }), [mode, ready]);

  return (
    <AppThemeContext.Provider value={value}>
      <WebDarkModeStyles enabled={mode === 'dark'} />
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside ThemeProvider.');
  return context;
}
