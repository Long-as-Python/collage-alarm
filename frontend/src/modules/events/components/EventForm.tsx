import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import {
  lessonSchema, singleSchema, findOverlap,
  type LessonFormValues, type SingleFormValues,
} from "../validation";
import type { ScheduleEvent, SoundItem, DayOfWeek } from "@/shared/types";
import { DAYS_UK } from "@/shared/utils";
import { SoundSelect } from "@/shared/ui/SoundSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

type Props = {
  initial?: ScheduleEvent;
  sounds: SoundItem[];
  events: ScheduleEvent[];
  onSubmit: (values: LessonFormValues | SingleFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitting?: boolean;
};

export function EventForm({ initial, sounds, events, onSubmit, onCancel, submitting }: Props) {
  const [type, setType] = useState<"lesson" | "single">(initial?.type ?? "lesson");

  if (type === "lesson") {
    return <LessonForm key="lesson"
      initial={initial?.type === "lesson" ? initial : undefined}
      sounds={sounds} events={events}
      onTypeChange={setType} onSubmit={onSubmit} onCancel={onCancel} submitting={submitting}
      lockType={!!initial} />;
  }
  return <SingleForm key="single"
    initial={initial?.type === "single" ? initial : undefined}
    sounds={sounds} events={events}
    onTypeChange={setType} onSubmit={onSubmit} onCancel={onCancel} submitting={submitting}
    lockType={!!initial} />;
}

function TypeSwitcher({ value, onChange, locked }: { value: "lesson" | "single"; onChange: (v: "lesson" | "single") => void; locked?: boolean }) {
  const opts = [{ v: "lesson", l: "Урок (2 сигнали)" }, { v: "single", l: "Одиночна подія" }] as const;
  return (
    <div className="inline-flex rounded-md border bg-muted p-1">
      {opts.map((o) => (
        <button key={o.v} type="button" disabled={locked}
          onClick={() => onChange(o.v as any)}
          className={cn(
            "rounded px-3 py-1 text-sm transition",
            value === o.v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            locked && "opacity-50 cursor-not-allowed",
          )}>{o.l}</button>
      ))}
    </div>
  );
}

function DaysPicker({ value, onChange, error }: { value: number[]; onChange: (v: number[]) => void; error?: string }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {([1,2,3,4,5,6,7] as DayOfWeek[]).map((d) => {
          const active = value.includes(d);
          return (
            <button key={d} type="button"
              onClick={() => onChange(active ? value.filter((x) => x !== d) : [...value, d].sort())}
              className={cn(
                "h-9 w-12 rounded-md border text-sm font-medium transition",
                active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
              aria-pressed={active}>{DAYS_UK[d]}</button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function LessonForm({ initial, sounds, events, onTypeChange, onSubmit, onCancel, submitting, lockType }: any) {
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: initial ?? {
      type: "lesson", label: "", daysOfWeek: [1,2,3,4,5],
      startTime: "08:30", endTime: "09:15",
      startSoundId: "", endSoundId: "", enabled: true,
    },
  });
  const values = form.watch();
  const overlap = useMemo(
    () => findOverlap(values, events, initial?.id),
    [values, events, initial?.id],
  );
  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <TypeSwitcher value="lesson" onChange={onTypeChange} locked={lockType} />

      <div>
        <Label>Назва (необов'язково)</Label>
        <Input {...form.register("label")} placeholder="Наприклад, 1 урок" />
      </div>

      <div>
        <Label>Дні тижня</Label>
        <Controller control={form.control} name="daysOfWeek" render={({ field }) => (
          <DaysPicker value={field.value} onChange={field.onChange} error={errors.daysOfWeek?.message as string} />
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Час початку</Label>
          <Input type="time" {...form.register("startTime")} />
          {errors.startTime && <p className="mt-1 text-xs text-destructive">{errors.startTime.message}</p>}
        </div>
        <div>
          <Label>Час кінця</Label>
          <Input type="time" {...form.register("endTime")} />
          {errors.endTime && <p className="mt-1 text-xs text-destructive">{errors.endTime.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Звук початку</Label>
          <Controller control={form.control} name="startSoundId" render={({ field }) => (
            <SoundSelect sounds={sounds} value={field.value} onChange={field.onChange}
              invalid={!!errors.startSoundId} ariaLabel="Звук початку уроку" />
          )} />
          {errors.startSoundId && <p className="mt-1 text-xs text-destructive">{errors.startSoundId.message}</p>}
        </div>
        <div>
          <Label>Звук кінця</Label>
          <Controller control={form.control} name="endSoundId" render={({ field }) => (
            <SoundSelect sounds={sounds} value={field.value} onChange={field.onChange}
              invalid={!!errors.endSoundId} ariaLabel="Звук кінця уроку" />
          )} />
          {errors.endSoundId && <p className="mt-1 text-xs text-destructive">{errors.endSoundId.message}</p>}
        </div>
      </div>

      <Controller control={form.control} name="enabled" render={({ field }) => (
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={field.value} onCheckedChange={field.onChange} />
          Увімкнено
        </label>
      )} />

      {overlap && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-foreground" />
          <div>
            <div className="font-medium">Конфлікт часу</div>
            <div className="text-muted-foreground">Перетин з подією: {overlap.type === "lesson" ? `${overlap.label ?? "Урок"} (${overlap.startTime}–${overlap.endTime})` : `${overlap.label} о ${overlap.triggerTime}`}</div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Скасувати</Button>}
        <Button type="submit" disabled={submitting}>{initial ? "Зберегти" : "Створити"}</Button>
      </div>
    </form>
  );
}

function SingleForm({ initial, sounds, events, onTypeChange, onSubmit, onCancel, submitting, lockType }: any) {
  const form = useForm<SingleFormValues>({
    resolver: zodResolver(singleSchema),
    defaultValues: initial ?? {
      type: "single", label: "", daysOfWeek: [1],
      triggerTime: "08:15", soundId: "", enabled: true,
    },
  });
  const values = form.watch();
  const overlap = useMemo(
    () => findOverlap(values, events, initial?.id),
    [values, events, initial?.id],
  );
  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <TypeSwitcher value="single" onChange={onTypeChange} locked={lockType} />

      <div>
        <Label>Назва</Label>
        <Input {...form.register("label")} placeholder="Наприклад, Гімн" />
        {errors.label && <p className="mt-1 text-xs text-destructive">{errors.label.message}</p>}
      </div>

      <div>
        <Label>Дні тижня</Label>
        <Controller control={form.control} name="daysOfWeek" render={({ field }) => (
          <DaysPicker value={field.value} onChange={field.onChange} error={errors.daysOfWeek?.message as string} />
        )} />
      </div>

      <div>
        <Label>Час відтворення</Label>
        <Input type="time" {...form.register("triggerTime")} />
        {errors.triggerTime && <p className="mt-1 text-xs text-destructive">{errors.triggerTime.message}</p>}
      </div>

      <div>
        <Label>Звук</Label>
        <Controller control={form.control} name="soundId" render={({ field }) => (
          <SoundSelect sounds={sounds} value={field.value} onChange={field.onChange}
            invalid={!!errors.soundId} ariaLabel="Звук події" />
        )} />
        {errors.soundId && <p className="mt-1 text-xs text-destructive">{errors.soundId.message}</p>}
      </div>

      <Controller control={form.control} name="enabled" render={({ field }) => (
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={field.value} onCheckedChange={field.onChange} />
          Увімкнено
        </label>
      )} />

      {overlap && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-foreground" />
          <div>
            <div className="font-medium">Конфлікт часу</div>
            <div className="text-muted-foreground">Перетин з: {overlap.type === "lesson" ? `${overlap.label ?? "Урок"} (${overlap.startTime}–${overlap.endTime})` : `${overlap.label} о ${overlap.triggerTime}`}</div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Скасувати</Button>}
        <Button type="submit" disabled={submitting}>{initial ? "Зберегти" : "Створити"}</Button>
      </div>
    </form>
  );
}
