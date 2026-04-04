/**
 * Wachtownik module - Watch schedule generator for yacht crews.
 *
 * Extracted from modules/wachtownik/index.html.
 */

export type { CrewMember, WatchSlot, DaySchedule, ScheduleSlot, WatchTemplate, Recommendation, Locale, AppState } from './types';
export { ROLES, WATCH_TEMPLATES, defaultCrew, defaultSlots, MAX_HISTORY_SIZE, t } from './constants';
export { getActiveCrew, recommendWatchSystem, generateRecommendationReason, calculateCoverage } from './utils/schedule-logic';
export { exportScheduleToPDF } from './utils/pdf-export';
export { buildShareUrl, generateQRCode } from './utils/qr-utils';
export { Icon } from './components/Icon';
export { Dropdown, DropdownItem } from './components/Dropdown';
export { ScheduleTableRow } from './components/ScheduleTableRow';
export { default as App } from './App';

