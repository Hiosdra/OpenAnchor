/** Module URL paths */
export const MODULES = {
  dashboard: '/',
  anchor: '/modules/anchor/',
  egzamin: '/modules/egzamin/',
  wachtownik: '/modules/wachtownik/',
} as const;

/** Common localStorage keys used across the app */
export const STORAGE_KEYS = {
  betaMode: 'oa_beta_mode',
  learnPosition: 'openanchor_learn_position',
  sailingSchedule: 'sailingSchedulePro',
} as const;

/** Mock geolocation coordinates */
export const GEO = {
  gdyniaHarbor: { latitude: 54.5189, longitude: 18.5305 },
  gdanskPort: { latitude: 54.3520, longitude: 18.6466 },
} as const;
