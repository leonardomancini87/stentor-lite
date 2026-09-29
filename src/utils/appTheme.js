export const APP_THEME_STORAGE_KEY = 'stentor:app-theme';

export const DEFAULT_APP_THEME = 'regia-live';

export const APP_THEMES = [
  { code: DEFAULT_APP_THEME, label: 'Regia dal vivo' },
];

export function normalizeAppTheme(_value) {
  return DEFAULT_APP_THEME;
}

export function getInitialAppTheme() {
  return DEFAULT_APP_THEME;
}

export function saveAppTheme(_theme) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, DEFAULT_APP_THEME);
  } catch {
    // Local storage may be unavailable in private browsing or locked-down contexts.
  }
}
