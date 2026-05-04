export type UserRole = "admin";

export interface UserSession {
  id: string;
  username: string;
  role: UserRole;
  token: string;
  expiresAt: string;
}

export interface SoundItem {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  tags: string[];
  isCustom: boolean;
  createdAt: string;
}

export type EventType = "lesson" | "single";

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // ISO: 1=Mon

export interface LessonEvent {
  id: string;
  type: "lesson";
  label?: string;
  daysOfWeek: DayOfWeek[];
  startTime: string; // HH:mm
  endTime: string;
  startSoundId: string;
  endSoundId: string;
  enabled: boolean;
}

export interface SingleEvent {
  id: string;
  type: "single";
  label: string;
  daysOfWeek: DayOfWeek[];
  triggerTime: string;
  soundId: string;
  enabled: boolean;
}

export type ScheduleEvent = LessonEvent | SingleEvent;

export interface AirRaidSettings {
  enabled: boolean;
  alarmSoundId: string | null;
  volume: number; // 0..100
  testMode: boolean;
  autoPauseSchedule: boolean;
  autoResumeSchedule: boolean;
}

export type ScheduleType = "weekly" | "daily" | "custom";

export interface SystemConfig {
  scheduleType: ScheduleType;
  defaultVolume: number;
  timezone: string;
  schedulerEnabled: boolean;
}

export interface CurrentSystemState {
  now: string;
  schedulerEnabled: boolean;
  airRaidActive: boolean;
  nextEvent: { id: string; label: string; time: string } | null;
}
