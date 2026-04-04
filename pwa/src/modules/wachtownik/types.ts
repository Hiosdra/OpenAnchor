export interface CrewMember {
  id: string;
  name: string;
  role: string;
}

export interface WatchSlot {
  id: string;
  start: string;
  end: string;
  reqCrew: number;
}

export interface ScheduleSlot extends WatchSlot {
  assigned: CrewMember[];
}

export interface DaySchedule {
  day: number;
  slots: ScheduleSlot[];
}

export interface WatchTemplate {
  nameKey: string;
  descKey: string;
  minCrew: number;
  optimalCrew: number;
  slots: Omit<WatchSlot, 'id'>[];
}

export interface Recommendation {
  templateKey: string;
  template: WatchTemplate;
  score: number;
  reason: string;
}

export interface AppState {
  crew: CrewMember[];
  slots: WatchSlot[];
  days: number;
  startDate: string;
  schedule: DaySchedule[];
  isGenerated: boolean;
  isNightMode: boolean;
  captainParticipates: boolean;
}

export interface CrewStat extends CrewMember {
  totalHours: number;
  hardWatches: number;
}

export interface AbsoluteSlot extends ScheduleSlot {
  dayNumber: number;
  absoluteStart: Date;
  absoluteEnd: Date;
}

export interface DashboardData {
  currentSlot: AbsoluteSlot | null;
  nextSlot: AbsoluteSlot | null;
  status: string;
  progress: number;
  allSlotsAbsolute: AbsoluteSlot[];
}

export interface CoverageResult {
  totalMinutes: number;
  gaps: CoverageGap[];
  hasFull24h: boolean;
}

export interface CoverageGap {
  start: string;
  end: string;
  minutes: number;
}

export type Locale = 'pl-PL' | 'en-US';

export interface RoleDefinition {
  id: string;
  label: string;
  icon: string;
  color: string;
}
