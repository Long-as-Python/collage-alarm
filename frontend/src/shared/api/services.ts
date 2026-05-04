import { apiClient, USE_MOCK } from "./client";
import { mockApi } from "./mock";
import type {
  AirRaidSettings, ScheduleEvent, SoundItem, SystemConfig,
  UserSession, CurrentSystemState, LessonEvent, SingleEvent,
} from "@/shared/types";

// Service layer — easy to swap mock for real backend.
// When USE_MOCK is false, real endpoints are called via axios.

export const authService = {
  login: (username: string, password: string) =>
    USE_MOCK ? mockApi.login(username, password)
      : apiClient.post<UserSession>("/auth/login", { username, password }).then((r) => r.data),
  adminLogin: (username: string, password: string) =>
    USE_MOCK ? mockApi.login(username, password)
      : apiClient.post<UserSession>("/auth/admin-login", { username, password }).then((r) => r.data),
  verify: () =>
    USE_MOCK ? mockApi.verify()
      : apiClient.get<UserSession>("/auth/verify").then((r) => r.data).catch(() => null),
  logout: () => mockApi.logout(),
};

export const soundsService = {
  list: () => USE_MOCK ? mockApi.listSounds()
    : apiClient.get<SoundItem[]>("/sounds").then((r) => r.data),
  create: (input: { name: string; description?: string; tags: string[]; fileUrl?: string; fileName?: string }) =>
    USE_MOCK ? mockApi.createSound(input as any)
      : apiClient.post<SoundItem>("/sounds", input).then((r) => r.data),
  update: (id: string, patch: Partial<SoundItem>) =>
    USE_MOCK ? mockApi.updateSound(id, patch)
      : apiClient.patch<SoundItem>(`/sounds/${id}`, patch).then((r) => r.data),
  remove: (id: string) =>
    USE_MOCK ? mockApi.deleteSound(id) : apiClient.delete(`/sounds/${id}`).then(() => undefined),
};

export const eventsService = {
  list: () => USE_MOCK ? mockApi.listEvents()
    : apiClient.get<ScheduleEvent[]>("/schedule/all").then((r) => r.data),
  create: (e: Omit<LessonEvent, "id"> | Omit<SingleEvent, "id">) =>
    USE_MOCK ? mockApi.createEvent(e)
      : apiClient.post<ScheduleEvent>("/schedule/events", e).then((r) => r.data),
  update: (id: string, patch: Partial<ScheduleEvent>) =>
    USE_MOCK ? mockApi.updateEvent(id, patch)
      : apiClient.patch<ScheduleEvent>(`/schedule/events/${id}`, patch).then((r) => r.data),
  remove: (id: string) =>
    USE_MOCK ? mockApi.deleteEvent(id) : apiClient.delete(`/schedule/events/${id}`).then(() => undefined),
  bulkUpdate: (ids: string[], patch: Partial<ScheduleEvent>) =>
    USE_MOCK ? mockApi.bulkUpdateEvents(ids, patch)
      : apiClient.post("/schedule/events/bulk-update", { ids, patch }).then(() => undefined),
  bulkRemove: (ids: string[]) =>
    USE_MOCK ? mockApi.bulkDeleteEvents(ids)
      : apiClient.post("/schedule/events/bulk-delete", { ids }).then(() => undefined),
};

export const airRaidService = {
  get: () => USE_MOCK ? mockApi.getAirRaid()
    : apiClient.get<AirRaidSettings>("/alarms/config").then((r) => r.data),
  save: (s: AirRaidSettings) =>
    USE_MOCK ? mockApi.saveAirRaid(s)
      : apiClient.post<AirRaidSettings>("/alarms/config", s).then((r) => r.data),
  test: () => USE_MOCK ? mockApi.testAirRaid()
    : apiClient.post("/alarms/test").then((r) => r.data),
  fire: () => USE_MOCK ? mockApi.fireAlarm()
    : apiClient.post("/alarms/fire").then((r) => r.data),
  current: () => apiClient.get("/alarms/current").then((r) => r.data).catch(() => null),
};

export const systemService = {
  getConfig: () => USE_MOCK ? mockApi.getConfig()
    : apiClient.get<SystemConfig>("/system/config").then((r) => r.data),
  saveConfig: (c: SystemConfig) =>
    USE_MOCK ? mockApi.saveConfig(c)
      : apiClient.post<SystemConfig>("/system/config", c).then((r) => r.data),
  setSchedulerEnabled: (enabled: boolean) =>
    USE_MOCK ? mockApi.setSchedulerEnabled(enabled)
      : apiClient.post("/system/scheduler", { enabled }).then(() => undefined),
  getCurrent: () => USE_MOCK ? mockApi.getCurrent()
    : apiClient.get<CurrentSystemState>("/schedule/current").then((r) => r.data),
};
