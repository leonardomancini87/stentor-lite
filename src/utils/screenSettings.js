import { SECOND_LANGUAGE_SCALE, clampSecondScale } from './stageLayout.js';

export const FONT_FAMILY_OPTIONS = [
  { label: 'Atkinson Hyperlegible', value: '"Atkinson Hyperlegible", Arial, sans-serif' },
  { label: 'Sistema sans', system: true, value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'OpenDyslexic', value: 'OpenDyslexic, Arial, sans-serif' },
];

export const SCREEN_ASPECT_OPTIONS = [
  { label: '16:9 panoramico', value: '16:9', ratio: '16 / 9', width: 1280, height: 720 },
  { label: '4:3 classico', value: '4:3', ratio: '4 / 3', width: 1024, height: 768 },
  { label: 'Libero', value: 'free', ratio: '16 / 9', width: 1280, height: 720 },
];

export function getScreenAspectOption(value) {
  return SCREEN_ASPECT_OPTIONS.find((option) => option.value === value) || SCREEN_ASPECT_OPTIONS[0];
}

export const DEFAULT_SCREENS = [
  {
    id: 'schermo-1',
    name: 'Schermo 1',
    publicBackground: '#000000',
    publicTextColor: '#F3E7B3',
    publicFontSize: '72px',
    publicVerticalAlign: 'top',
    publicPaddingTop: '6vh',
    publicMaxWidth: '90%',
    publicFontFamily: '"Atkinson Hyperlegible", Arial, sans-serif',
    publicFadeInMs: 120,
    publicFadeOutMs: 120,
    publicBlackoutFadeMs: 160,
    publicLanguage: 'active',
    publicSecondLanguage: '',
    publicSecondScale: SECOND_LANGUAGE_SCALE.default,
    publicAspectRatio: '16:9',
    publicOffsetX: 0,
    publicOffsetY: 0,
  },
];

// Spostamento del testo sullo schermo, in percentuale della larghezza (X) e dell'altezza
// della fascia del testo (Y); 0 è la posizione normale, X positivo verso destra, Y verso il basso.
// In verticale si può uscire dalla fascia fino ai bordi di uno schermo 16:9 o 4:3.
export const SCREEN_OFFSET_LIMITS = { x: 50, y: 100 };

export function clampScreenOffset(value, axis = 'x') {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  const limit = SCREEN_OFFSET_LIMITS[axis] || SCREEN_OFFSET_LIMITS.x;
  const clamped = Math.max(-limit, Math.min(limit, parsed));
  return Math.round(clamped);
}

// Schermi dimostrativi delle prime versioni («Studio Torino», «Pannello Lione»): se sono rimasti
// come erano, nei progetti già salvati diventano un solo schermo, «Schermo 1».
const LEGACY_DEMO_SCREENS = { 'studio-torino': 'Studio Torino', 'pannello-lione': 'Pannello Lione' };

function isLegacyDemoScreen(screen) {
  return Boolean(screen?.id) && LEGACY_DEMO_SCREENS[screen.id] === screen.name;
}

function migrateLegacyDemoScreens(screens) {
  if (!screens.some(isLegacyDemoScreen)) return screens;
  const kept = screens.filter((screen) => screen.id !== 'pannello-lione' || !isLegacyDemoScreen(screen));
  return kept.map((screen) => (
    screen.id === 'studio-torino' && isLegacyDemoScreen(screen)
      ? { ...screen, name: DEFAULT_SCREENS[0].name, publicLanguage: 'active' }
      : screen
  ));
}

function cloneScreen(screen) {
  return { ...screen };
}

export function clampTransitionMs(value, fallback = 120) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1200, parsed));
}

export function screenToPublicSettings(screen) {
  return {
    publicBackground: screen.publicBackground || '#000000',
    publicTextColor: screen.publicTextColor || '#F3E7B3',
    publicFontSize: screen.publicFontSize || '58px',
    publicVerticalAlign: screen.publicVerticalAlign || 'center',
    publicPaddingTop: screen.publicPaddingTop || '0vh',
    publicMaxWidth: screen.publicMaxWidth || '90%',
    publicFontFamily: screen.publicFontFamily || FONT_FAMILY_OPTIONS[0].value,
    publicFadeInMs: clampTransitionMs(screen.publicFadeInMs, 120),
    publicFadeOutMs: clampTransitionMs(screen.publicFadeOutMs, 120),
    publicBlackoutFadeMs: clampTransitionMs(screen.publicBlackoutFadeMs, 160),
    publicLanguage: screen.publicLanguage || 'active',
    publicSecondLanguage: screen.publicSecondLanguage || '',
    publicSecondScale: clampSecondScale(screen.publicSecondScale),
    publicAspectRatio: getScreenAspectOption(screen.publicAspectRatio).value,
    publicOffsetX: clampScreenOffset(screen.publicOffsetX),
    publicOffsetY: clampScreenOffset(screen.publicOffsetY, 'y'),
  };
}

function normalizeScreen(screen, fallback, index) {
  const base = fallback || DEFAULT_SCREENS[index] || DEFAULT_SCREENS[0];
  const id = screen?.id || (index === 0 ? base.id : `schermo-${index + 1}`);

  return {
    ...cloneScreen(base),
    ...(screen || {}),
    id,
    name: screen?.name || (index === 0 ? base.name : `Schermo ${index + 1}`),
  };
}

export function getScreens(settings = {}) {
  if (Array.isArray(settings.screens) && settings.screens.length > 0) {
    return migrateLegacyDemoScreens(settings.screens).map((screen, index) =>
      normalizeScreen(screen, DEFAULT_SCREENS[index], index)
    );
  }

  return DEFAULT_SCREENS.map((screen) => cloneScreen(screen));
}

export function getActiveScreenId(settings = {}) {
  const screens = getScreens(settings);
  return settings.activeScreenId || screens[0]?.id || DEFAULT_SCREENS[0].id;
}

export function getActiveScreen(settings = {}) {
  const screens = getScreens(settings);
  const activeScreenId = getActiveScreenId(settings);
  return screens.find((screen) => screen.id === activeScreenId) || screens[0] || DEFAULT_SCREENS[0];
}

export function getPublicSettings(settings = {}) {
  return screenToPublicSettings(getActiveScreen(settings));
}

export function getScreenLanguage(screen = {}, activeLanguage = 'it', languages = []) {
  const requested = screen.publicLanguage || 'active';
  if (requested === 'active') return activeLanguage || languages[0] || 'it';
  if (Array.isArray(languages) && languages.includes(requested)) return requested;
  return activeLanguage || languages[0] || requested || 'it';
}

// Seconda lingua dello schermo (sotto la prima, più piccola): '' se non c'è, se non è più tra
// le lingue del progetto o se coincide con la prima.
export function getScreenSecondLanguage(screen = {}, activeLanguage = 'it', languages = []) {
  const requested = screen.publicSecondLanguage || '';
  if (!requested || !Array.isArray(languages) || !languages.includes(requested)) return '';
  return requested === getScreenLanguage(screen, activeLanguage, languages) ? '' : requested;
}

export function withScreensInitialized(settings = {}) {
  const screens = getScreens(settings);
  const activeScreenId = getActiveScreenId(settings);
  const activeScreen = screens.find((screen) => screen.id === activeScreenId) || screens[0];

  return {
    ...settings,
    activeScreenId: activeScreen.id,
    screens,
    ...screenToPublicSettings(activeScreen),
  };
}

export function updateActiveScreenSettings(settings = {}, patch = {}) {
  const current = withScreensInitialized(settings);
  const screens = current.screens.map((screen) =>
    screen.id === current.activeScreenId
      ? { ...screen, ...patch }
      : screen
  );
  const activeScreen = screens.find((screen) => screen.id === current.activeScreenId) || screens[0];

  return {
    ...current,
    screens,
    ...screenToPublicSettings(activeScreen),
  };
}

// Aggiorna uno schermo preciso (anche se non è quello attivo).
export function updateScreenSettings(settings = {}, screenId, patch = {}) {
  const current = withScreensInitialized(settings);
  if (!screenId || screenId === current.activeScreenId) return updateActiveScreenSettings(current, patch);
  return {
    ...current,
    screens: current.screens.map((screen) => (screen.id === screenId ? { ...screen, ...patch } : screen)),
  };
}

export function setActiveScreen(settings = {}, screenId) {
  const current = withScreensInitialized(settings);
  const activeScreen = current.screens.find((screen) => screen.id === screenId) || current.screens[0];

  return {
    ...current,
    activeScreenId: activeScreen.id,
    ...screenToPublicSettings(activeScreen),
  };
}

export function makeScreenId(name) {
  const slug = String(name || 'schermo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'schermo';

  return `${slug}-${Date.now().toString(36)}`;
}

export function createScreen(settings = {}, name = 'Nuovo schermo') {
  const current = withScreensInitialized(settings);
  const base = getActiveScreen(current);
  const screen = {
    ...base,
    id: makeScreenId(name),
    name,
  };

  return {
    ...current,
    activeScreenId: screen.id,
    screens: [...current.screens, screen],
    ...screenToPublicSettings(screen),
  };
}

export function deleteActiveScreen(settings = {}) {
  const current = withScreensInitialized(settings);

  if (current.screens.length <= 1) {
    return current;
  }

  const screens = current.screens.filter((screen) => screen.id !== current.activeScreenId);
  const activeScreen = screens[0];

  return {
    ...current,
    activeScreenId: activeScreen.id,
    screens,
    ...screenToPublicSettings(activeScreen),
  };
}
