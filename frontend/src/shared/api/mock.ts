import type {
  AirRaidSettings, ScheduleEvent, SoundItem, SystemConfig,
  UserSession, CurrentSystemState, LessonEvent, SingleEvent,
} from "@/shared/types";

const uid = () => Math.random().toString(36).slice(2, 10);
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const initialSounds: SoundItem[] = [
  { id: "s1", name: "Дзвоник класичний", fileUrl: "", tags: ["дзвоник", "урок"], isCustom: false, createdAt: new Date().toISOString() },
  { id: "s2", name: "М'який дзвін", fileUrl: "", tags: ["дзвоник", "м'який"], isCustom: false, createdAt: new Date().toISOString() },
  { id: "s3", name: "Гімн України", fileUrl: "", tags: ["гімн", "ранок"], isCustom: false, createdAt: new Date().toISOString() },
  { id: "s4", name: "Сирена тривоги", fileUrl: "", tags: ["тривога", "сирена"], isCustom: false, createdAt: new Date().toISOString() },
  { id: "s5", name: "Відбій тривоги", fileUrl: "", tags: ["тривога", "відбій"], isCustom: false, createdAt: new Date().toISOString() },
];

const initialEvents: ScheduleEvent[] = [
  { id: "e1", type: "lesson", label: "1 урок", daysOfWeek: [1,2,3,4,5], startTime: "08:30", endTime: "09:15", startSoundId: "s1", endSoundId: "s2", enabled: true },
  { id: "e2", type: "lesson", label: "2 урок", daysOfWeek: [1,2,3,4,5], startTime: "09:25", endTime: "10:10", startSoundId: "s1", endSoundId: "s2", enabled: true },
  { id: "e3", type: "single", label: "Гімн", daysOfWeek: [1], triggerTime: "08:15", soundId: "s3", enabled: true },
];

interface DB {
  sounds: SoundItem[];
  events: ScheduleEvent[];
  airRaid: AirRaidSettings;
  config: SystemConfig;
  session: UserSession | null;
}

const STORAGE_KEY = "school-bell-mock-db-v1";
function load(): DB {
  if (typeof window === "undefined") {
    return {
      sounds: initialSounds, events: initialEvents,
      airRaid: { enabled: true, alarmSoundId: "s4", volume: 80, testMode: false, autoPauseSchedule: true, autoResumeSchedule: true },
      config: { scheduleType: "weekly", defaultVolume: 70, timezone: "Europe/Kyiv", schedulerEnabled: true },
      session: null,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const db: DB = {
    sounds: initialSounds, events: initialEvents,
    airRaid: { enabled: true, alarmSoundId: "s4", volume: 80, testMode: false, autoPauseSchedule: true, autoResumeSchedule: true },
    config: { scheduleType: "weekly", defaultVolume: 70, timezone: "Europe/Kyiv", schedulerEnabled: true },
    session: null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}
function save(db: DB) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
function get(): DB { return load(); }
function set(updater: (db: DB) => void) { const db = load(); updater(db); save(db); return db; }

export const mockApi = {
  async login(username: string, password: string): Promise<UserSession> {
    await delay();
    if (!username || !password) throw new Error("Введіть логін і пароль");
    if (password.length < 3) throw new Error("Невірний логін або пароль");
    const session: UserSession = {
      id: uid(), username, role: "admin",
      token: "mock." + uid(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
    set((db) => { db.session = session; });
    return session;
  },
  async verify(): Promise<UserSession | null> {
    await delay(80);
    return get().session;
  },
  async logout() { set((db) => { db.session = null; }); },

  async listSounds(): Promise<SoundItem[]> { await delay(80); return get().sounds; },
  async createSound(input: Omit<SoundItem, "id" | "createdAt" | "isCustom"> & { fileName?: string }): Promise<SoundItem> {
    await delay();
    const item: SoundItem = {
      id: uid(), name: input.name, description: input.description,
      fileUrl: input.fileUrl || `mock://${input.fileName || input.name}`,
      tags: input.tags ?? [], isCustom: true, createdAt: new Date().toISOString(),
    };
    set((db) => { db.sounds.unshift(item); });
    return item;
  },
  async updateSound(id: string, patch: Partial<SoundItem>): Promise<SoundItem> {
    await delay();
    const db = set((db) => {
      const i = db.sounds.findIndex((s) => s.id === id);
      if (i >= 0) db.sounds[i] = { ...db.sounds[i], ...patch };
    });
    return db.sounds.find((s) => s.id === id)!;
  },
  async deleteSound(id: string) { await delay(); set((db) => { db.sounds = db.sounds.filter((s) => s.id !== id); }); },

  async listEvents(): Promise<ScheduleEvent[]> { await delay(80); return get().events; },
  async createEvent(e: Omit<LessonEvent, "id"> | Omit<SingleEvent, "id">): Promise<ScheduleEvent> {
    await delay();
    const event = { ...e, id: uid() } as ScheduleEvent;
    set((db) => { db.events.push(event); });
    return event;
  },
  async updateEvent(id: string, patch: Partial<ScheduleEvent>): Promise<ScheduleEvent> {
    await delay();
    const db = set((db) => {
      const i = db.events.findIndex((e) => e.id === id);
      if (i >= 0) db.events[i] = { ...db.events[i], ...patch } as ScheduleEvent;
    });
    return db.events.find((e) => e.id === id)!;
  },
  async deleteEvent(id: string) { await delay(); set((db) => { db.events = db.events.filter((e) => e.id !== id); }); },
  async bulkUpdateEvents(ids: string[], patch: Partial<ScheduleEvent>) {
    await delay();
    set((db) => {
      db.events = db.events.map((e) => ids.includes(e.id) ? { ...e, ...patch } as ScheduleEvent : e);
    });
  },
  async bulkDeleteEvents(ids: string[]) {
    await delay();
    set((db) => { db.events = db.events.filter((e) => !ids.includes(e.id)); });
  },

  async getAirRaid(): Promise<AirRaidSettings> { await delay(80); return get().airRaid; },
  async saveAirRaid(s: AirRaidSettings): Promise<AirRaidSettings> {
    await delay();
    set((db) => { db.airRaid = s; });
    return s;
  },
  async testAirRaid(): Promise<{ ok: true }> { await delay(); return { ok: true }; },
  async fireAlarm(): Promise<{ ok: true }> { await delay(); return { ok: true }; },

  async getConfig(): Promise<SystemConfig> { await delay(80); return get().config; },
  async saveConfig(c: SystemConfig): Promise<SystemConfig> {
    await delay(); set((db) => { db.config = c; }); return c;
  },
  async setSchedulerEnabled(enabled: boolean) {
    await delay();
    set((db) => { db.config.schedulerEnabled = enabled; });
  },

  async getCurrent(): Promise<CurrentSystemState> {
    await delay(80);
    const db = get();
    return {
      now: new Date().toISOString(),
      schedulerEnabled: db.config.schedulerEnabled,
      airRaidActive: false,
      nextEvent: null,
    };
  },
};
