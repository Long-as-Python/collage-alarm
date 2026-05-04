import { z } from "zod";
import type { ScheduleEvent } from "@/shared/types";
import { rangesOverlap } from "@/shared/utils";

const time = z.string().regex(/^\d{2}:\d{2}$/, "Час у форматі ГГ:ХХ");
const days = z.array(z.number().min(1).max(7)).min(1, "Оберіть хоча б один день");

export const lessonSchema = z.object({
  type: z.literal("lesson"),
  label: z.string().max(60).optional(),
  daysOfWeek: days,
  startTime: time,
  endTime: time,
  startSoundId: z.string().min(1, "Оберіть звук початку"),
  endSoundId: z.string().min(1, "Оберіть звук кінця"),
  enabled: z.boolean(),
}).refine((v) => v.startTime < v.endTime, {
  message: "Час початку має бути раніше за час кінця",
  path: ["endTime"],
});

export const singleSchema = z.object({
  type: z.literal("single"),
  label: z.string().min(1, "Введіть назву").max(60),
  daysOfWeek: days,
  triggerTime: time,
  soundId: z.string().min(1, "Оберіть звук"),
  enabled: z.boolean(),
});

export type LessonFormValues = z.infer<typeof lessonSchema>;
export type SingleFormValues = z.infer<typeof singleSchema>;

/** Detects time overlaps with existing events on the same day. */
export function findOverlap(
  draft: { type: "lesson" | "single"; daysOfWeek: number[]; startTime?: string; endTime?: string; triggerTime?: string },
  existing: ScheduleEvent[],
  excludeId?: string,
): ScheduleEvent | null {
  for (const e of existing) {
    if (e.id === excludeId) continue;
    const sharedDay = e.daysOfWeek.some((d) => draft.daysOfWeek.includes(d));
    if (!sharedDay) continue;
    const aStart = draft.type === "lesson" ? draft.startTime! : draft.triggerTime!;
    const aEnd = draft.type === "lesson" ? draft.endTime! : draft.triggerTime!;
    const bStart = e.type === "lesson" ? e.startTime : e.triggerTime;
    const bEnd = e.type === "lesson" ? e.endTime : e.triggerTime;
    // Single event: treat as 1-minute window
    const aS = aStart, aE = aStart === aEnd ? addMin(aEnd, 1) : aEnd;
    const bS = bStart, bE = bStart === bEnd ? addMin(bEnd, 1) : bEnd;
    if (rangesOverlap(aS, aE, bS, bE)) return e;
  }
  return null;
}

function addMin(t: string, m: number) {
  const [h, mm] = t.split(":").map(Number);
  const total = h * 60 + mm + m;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
