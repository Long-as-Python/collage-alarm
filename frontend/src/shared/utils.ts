import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import "dayjs/locale/uk";

dayjs.locale("uk");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAYS_UK: Record<number, string> = {
  1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Нд",
};
export const DAYS_FULL_UK: Record<number, string> = {
  1: "Понеділок", 2: "Вівторок", 3: "Середа", 4: "Четвер",
  5: "П'ятниця", 6: "Субота", 7: "Неділя",
};

export function formatTime(t: string) { return t; }
export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aS = timeToMinutes(aStart), aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart), bE = timeToMinutes(bEnd);
  return aS < bE && bS < aE;
}

export { dayjs };
