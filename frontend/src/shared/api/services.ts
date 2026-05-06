import { apiClient, USE_MOCK } from "./client";
import { mockApi } from "./mock";
import type {
  AirRaidSettings, ScheduleEvent, SoundItem, SystemConfig,
  UserSession, CurrentSystemState, LessonEvent, SingleEvent,
} from "@/shared/types";

// Service layer — easy to swap mock for real backend.
// When USE_MOCK is false, real endpoints are called via axios.

type BackendScheduleType = "full" | "short";

interface BackendScheduleSlot {
  id: number | string;
  label?: string;
  daysOfWeek?: number[];
  startTime: string;
  endTime: string;
  soundType: string;
  startSoundType?: string;
  endSoundType?: string;
  enabled?: boolean;
}

interface BackendScheduleAllResponse {
  success: boolean;
  scheduleType: BackendScheduleType;
  full: BackendScheduleSlot[];
  short: BackendScheduleSlot[];
}

interface BackendScheduleCurrentResponse {
  success: boolean;
  scheduleType: BackendScheduleType;
  schedule: BackendScheduleSlot[];
}

interface BackendAlarmConfigResponse {
  isEnabled: boolean;
  scheduleType: BackendScheduleType;
  lessons: BackendScheduleSlot[];
  schedules: Record<BackendScheduleType, BackendScheduleSlot[]>;
  events?: BackendSingleEvent[];
  mainSoftApiUrl?: string;
}

interface BackendSingleEvent {
  id: string;
  label: string;
  daysOfWeek: number[];
  triggerTime: string;
  soundType: string;
  enabled?: boolean;
}

interface BackendSoundsResponse {
  success: boolean;
  sounds: Array<{
    id: string;
    label: string;
    description?: string;
    tags?: string[];
    fileName?: string;
    createdAt?: string;
    isCustom?: boolean;
    commandEnv: string;
  }>;
}

interface BackendCurrentTimeResponse {
  success: boolean;
  time: string;
}

const WEEKDAYS = [1, 2, 3, 4, 5] as const;

function makeSession(username: string, token: string, role: "admin" | "student" = "admin"): UserSession {
  return {
    id: role,
    username,
    role: role === "student" ? "admin" : role,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function mapScheduleSlotToEvent(slot: BackendScheduleSlot): LessonEvent {
  return {
    id: `lesson-${slot.id}`,
    type: "lesson",
    label: slot.label || `Урок ${slot.id}`,
    daysOfWeek: (slot.daysOfWeek?.length ? slot.daysOfWeek : [...WEEKDAYS]) as LessonEvent["daysOfWeek"],
    startTime: slot.startTime,
    endTime: slot.endTime,
    startSoundId: slot.startSoundType || slot.soundType,
    endSoundId: slot.endSoundType || slot.soundType,
    enabled: slot.enabled ?? true,
  };
}

function mapSingleEvent(event: BackendSingleEvent): SingleEvent {
  return {
    id: event.id,
    type: "single",
    label: event.label,
    daysOfWeek: event.daysOfWeek as SingleEvent["daysOfWeek"],
    triggerTime: event.triggerTime,
    soundId: event.soundType,
    enabled: event.enabled ?? true,
  };
}

function mapSoundTags(soundId: string): string[] {
  switch (soundId) {
    case "bell":
      return ["дзвоник", "урок"];
    case "hymn":
      return ["гімн", "ранок"];
    case "fire_alarm":
      return ["тривога", "сирена"];
    case "custom":
      return ["кастомний"];
    default:
      return [];
  }
}

function normalizeEvents(config: BackendAlarmConfigResponse): ScheduleEvent[] {
  const selected = config.schedules?.[config.scheduleType] ?? config.lessons ?? [];
  return [
    ...selected.map(mapScheduleSlotToEvent),
    ...(config.events ?? []).map(mapSingleEvent),
  ];
}

function normalizeSystemConfig(payload: BackendAlarmConfigResponse): SystemConfig {
  return {
    scheduleType: payload.scheduleType,
    defaultVolume: 100,
    timezone: "Europe/Kyiv",
    schedulerEnabled: payload.isEnabled,
  };
}

function normalizeAirRaid(payload: BackendAlarmConfigResponse): AirRaidSettings {
  return {
    enabled: payload.isEnabled,
    alarmSoundId: "fire_alarm",
    volume: 100,
    testMode: false,
    autoPauseSchedule: true,
    autoResumeSchedule: true,
  };
}

async function getBackendAlarmConfig() {
  return apiClient.get<BackendAlarmConfigResponse>("/alarms/config").then((r) => r.data);
}

function makeEventId() {
  return `event-${Math.random().toString(36).slice(2, 10)}`;
}

function mapLessonEventToBackend(event: Omit<LessonEvent, "id"> | LessonEvent, fallbackId?: string | number): BackendScheduleSlot {
  const rawId = "id" in event ? event.id.replace(/^lesson-/, "") : fallbackId ?? makeEventId();
  return {
    id: rawId,
    label: event.label || "",
    daysOfWeek: event.daysOfWeek,
    startTime: event.startTime,
    endTime: event.endTime,
    soundType: event.startSoundId,
    startSoundType: event.startSoundId,
    endSoundType: event.endSoundId,
    enabled: event.enabled,
  };
}

function mapSingleEventToBackend(event: Omit<SingleEvent, "id"> | SingleEvent, fallbackId?: string): BackendSingleEvent {
  return {
    id: "id" in event ? event.id : fallbackId ?? makeEventId(),
    label: event.label,
    daysOfWeek: event.daysOfWeek,
    triggerTime: event.triggerTime,
    soundType: event.soundId,
    enabled: event.enabled,
  };
}

async function updateBackendEvents(
  mutator: (config: BackendAlarmConfigResponse) => void,
): Promise<BackendAlarmConfigResponse> {
  const config = await getBackendAlarmConfig();
  mutator(config);
  const response = await apiClient.post<{ success: boolean; config: BackendAlarmConfigResponse }>("/alarms/config", config);
  return response.data.config;
}

export const authService = {
  login: (username: string, password: string) =>
    USE_MOCK ? mockApi.login(username, password)
      : apiClient.post<{ success: boolean; token: string }>("/auth/login", { username, password }).then((r) => {
        if (!r.data.success || !r.data.token) {
          throw new Error("Не вдалось увійти");
        }
        return makeSession(username || "student", r.data.token, "student");
      }),
  adminLogin: (username: string, password: string) =>
    USE_MOCK ? mockApi.login(username, password)
      : apiClient.post<{ success: boolean; token?: string; error?: string }>("/auth/admin-login", { password }).then((r) => {
        if (!r.data.success || !r.data.token) {
          throw new Error(r.data.error || "Не вдалось увійти");
        }
        return makeSession(username || "admin", r.data.token);
      }),
  verify: () =>
    USE_MOCK ? mockApi.verify()
      : apiClient.get<{ success: boolean }>("/auth/verify").then((r) => (r.data.success ? makeSession("admin", "verified-session") : null)).catch(() => null),
  logout: () => mockApi.logout(),
};

export const soundsService = {
  list: () => USE_MOCK ? mockApi.listSounds()
    : apiClient.get<BackendSoundsResponse>("/alarms/sounds").then((r) => r.data.sounds.map((sound) => ({
      id: sound.id,
      name: sound.label,
      description: sound.description || sound.commandEnv,
      fileUrl: "",
      tags: sound.tags?.length ? sound.tags : mapSoundTags(sound.id),
      isCustom: sound.isCustom ?? sound.id === "custom",
      createdAt: sound.createdAt || new Date().toISOString(),
    }))),
  create: (input: { name: string; description?: string; tags: string[]; file?: File; fileUrl?: string; fileName?: string }) =>
    USE_MOCK ? mockApi.createSound(input as any)
      : (() => {
          if (!input.file) {
            return Promise.reject(new Error("Файл звуку обов'язковий"));
          }
          const formData = new FormData();
          formData.append("name", input.name);
          if (input.description) formData.append("description", input.description);
          formData.append("tags", input.tags.join(","));
          formData.append("file", input.file);
          return apiClient.post<{ success: boolean; sound: BackendSoundsResponse["sounds"][number] }>("/alarms/sounds", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          }).then((r) => ({
            id: r.data.sound.id,
            name: r.data.sound.label,
            description: r.data.sound.description,
            fileUrl: "",
            tags: r.data.sound.tags ?? [],
            isCustom: true,
            createdAt: r.data.sound.createdAt || new Date().toISOString(),
          }));
        })(),
  update: (id: string, patch: Partial<SoundItem> & { file?: File }) =>
    USE_MOCK ? mockApi.updateSound(id, patch)
      : apiClient.post<{ success: boolean; sound: BackendSoundsResponse["sounds"][number] }>("/alarms/sounds/update", {
          id,
          name: patch.name,
          description: patch.description,
          tags: patch.tags ?? [],
        }).then((r) => ({
          id: r.data.sound.id,
          name: r.data.sound.label,
          description: r.data.sound.description,
          fileUrl: "",
          tags: r.data.sound.tags ?? [],
          isCustom: true,
          createdAt: r.data.sound.createdAt || new Date().toISOString(),
        })),
  remove: (id: string) =>
    USE_MOCK ? mockApi.deleteSound(id)
      : apiClient.post<{ success: boolean }>("/alarms/sounds/delete", { id }).then(() => undefined),
};

export const eventsService = {
  list: () => USE_MOCK ? mockApi.listEvents()
    : getBackendAlarmConfig().then(normalizeEvents),
  create: (e: Omit<LessonEvent, "id"> | Omit<SingleEvent, "id">) =>
    USE_MOCK ? mockApi.createEvent(e)
      : updateBackendEvents((config) => {
          if (e.type === "lesson") {
            const nextSchedule = [...(config.schedules?.[config.scheduleType] ?? config.lessons ?? [])];
            nextSchedule.push(mapLessonEventToBackend(e));
            config.schedules[config.scheduleType] = nextSchedule;
            config.lessons = nextSchedule;
            return;
          }

          const nextEvents = [...(config.events ?? [])];
          nextEvents.push(mapSingleEventToBackend(e));
          config.events = nextEvents;
        }).then(() => (e.type === "lesson" ? { ...e, id: makeEventId() } : { ...e, id: makeEventId() })),
  update: (id: string, patch: Partial<ScheduleEvent>) =>
    USE_MOCK ? mockApi.updateEvent(id, patch)
      : updateBackendEvents((config) => {
          if (id.startsWith("lesson-")) {
            const lessonId = id.replace(/^lesson-/, "");
            const nextSchedule = [...(config.schedules?.[config.scheduleType] ?? config.lessons ?? [])];
            const index = nextSchedule.findIndex((item) => String(item.id) === lessonId);
            if (index === -1) {
              throw new Error("Подію не знайдено");
            }
            const current = mapScheduleSlotToEvent(nextSchedule[index]);
            const merged = { ...current, ...patch, id } as LessonEvent;
            nextSchedule[index] = mapLessonEventToBackend(merged, nextSchedule[index].id);
            config.schedules[config.scheduleType] = nextSchedule;
            config.lessons = nextSchedule;
            return;
          }

          const nextEvents = [...(config.events ?? [])];
          const index = nextEvents.findIndex((item) => item.id === id);
          if (index === -1) {
            throw new Error("Подію не знайдено");
          }
          const current = mapSingleEvent(nextEvents[index]);
          const merged = { ...current, ...patch, id } as SingleEvent;
          nextEvents[index] = mapSingleEventToBackend(merged, id);
          config.events = nextEvents;
        }).then(() => ({ id, ...patch } as ScheduleEvent)),
  remove: (id: string) =>
    USE_MOCK ? mockApi.deleteEvent(id)
      : updateBackendEvents((config) => {
          if (id.startsWith("lesson-")) {
            const lessonId = id.replace(/^lesson-/, "");
            const nextSchedule = (config.schedules?.[config.scheduleType] ?? config.lessons ?? [])
              .filter((item) => String(item.id) !== lessonId);
            config.schedules[config.scheduleType] = nextSchedule;
            config.lessons = nextSchedule;
            return;
          }
          config.events = (config.events ?? []).filter((item) => item.id !== id);
        }).then(() => undefined),
  bulkUpdate: (ids: string[], patch: Partial<ScheduleEvent>) =>
    USE_MOCK ? mockApi.bulkUpdateEvents(ids, patch)
      : Promise.all(ids.map((id) => eventsService.update(id, patch))).then(() => undefined),
  bulkRemove: (ids: string[]) =>
    USE_MOCK ? mockApi.bulkDeleteEvents(ids)
      : Promise.all(ids.map((id) => eventsService.remove(id))).then(() => undefined),
};

export const airRaidService = {
  get: () => USE_MOCK ? mockApi.getAirRaid()
    : getBackendAlarmConfig().then(normalizeAirRaid),
  save: (s: AirRaidSettings) =>
    USE_MOCK ? mockApi.saveAirRaid(s)
      : getBackendAlarmConfig()
        .then((config) => apiClient.post("/alarms/config", { ...config, isEnabled: s.enabled }))
        .then(() => s),
  test: () => USE_MOCK ? mockApi.testAirRaid()
    : apiClient.post("/alarms/fire").then((r) => r.data),
  fire: () => USE_MOCK ? mockApi.fireAlarm()
    : apiClient.post("/alarms/fire").then((r) => r.data),
  playSound: (soundType: string) =>
    USE_MOCK ? Promise.resolve()
    : apiClient.post("/alarms/play", { soundType }).then((r) => r.data),
  current: () => apiClient.get("/alarms/current").then((r) => r.data).catch(() => null),
};

export const systemService = {
  getConfig: () => USE_MOCK ? mockApi.getConfig()
    : getBackendAlarmConfig().then(normalizeSystemConfig),
  saveConfig: (c: SystemConfig) =>
    USE_MOCK ? mockApi.saveConfig(c)
      : getBackendAlarmConfig()
        .then((config) => apiClient.post("/alarms/config", {
          ...config,
          isEnabled: c.schedulerEnabled,
          scheduleType: c.scheduleType === "short" ? "short" : "full",
          lessons: config.schedules[c.scheduleType === "short" ? "short" : "full"] ?? config.lessons,
        }))
        .then(() => c),
  setSchedulerEnabled: (enabled: boolean) =>
    USE_MOCK ? mockApi.setSchedulerEnabled(enabled)
      : getBackendAlarmConfig()
        .then((config) => apiClient.post("/alarms/config", { ...config, isEnabled: enabled }))
        .then(() => undefined),
  getCurrent: () => USE_MOCK ? mockApi.getCurrent()
    : Promise.all([
        apiClient.get<BackendCurrentTimeResponse>("/alarms/current").then((r) => r.data),
        getBackendAlarmConfig(),
        apiClient.get<BackendScheduleCurrentResponse>("/schedule/current").then((r) => r.data),
      ]).then(([time, config, current]) => ({
        now: time.time,
        schedulerEnabled: config.isEnabled,
        airRaidActive: false,
        nextEvent: current.schedule[0]
          ? {
              id: `lesson-${current.schedule[0].id}`,
              label: `Урок ${current.schedule[0].id}`,
              time: current.schedule[0].startTime,
            }
          : null,
      })),
};
