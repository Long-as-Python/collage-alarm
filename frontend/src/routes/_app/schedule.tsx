import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCreateEvent, useEvents, useSounds, useUpdateEvent, useDeleteEvent } from "@/shared/api/hooks";
import { PageHeader, LoadingState, EmptyState, ErrorState } from "@/shared/ui/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventForm } from "@/modules/events/components/EventForm";
import { DAYS_UK } from "@/shared/utils";
import type { ScheduleEvent, DayOfWeek } from "@/shared/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/schedule")({ component: SchedulePage });

const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i); // 07..20

function SchedulePage() {
  const events = useEvents();
  const sounds = useSounds();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();
  const [view, setView] = useState<"week" | "day">("week");
  const [day, setDay] = useState<DayOfWeek>(1);
  const [dialog, setDialog] = useState<{ open: boolean; editing?: ScheduleEvent }>({ open: false });

  const days: DayOfWeek[] = view === "week" ? [1,2,3,4,5,6,7] : [day];

  const byDay = useMemo(() => {
    const map = new Map<number, ScheduleEvent[]>();
    days.forEach((d) => map.set(d, []));
    (events.data ?? []).forEach((e) => {
      e.daysOfWeek.forEach((d) => {
        if (map.has(d)) map.get(d)!.push(e);
      });
    });
    return map;
  }, [events.data, days]);

  async function handleSubmit(values: any) {
    try {
      if (dialog.editing) {
        await update.mutateAsync({ id: dialog.editing.id, patch: values });
        toast.success("Подію оновлено");
      } else {
        await create.mutateAsync(values);
        toast.success("Подію створено");
      }
      setDialog({ open: false });
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка збереження");
    }
  }

  async function handleDelete() {
    if (!dialog.editing) return;
    await remove.mutateAsync(dialog.editing.id);
    toast.success("Подію видалено");
    setDialog({ open: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Розклад"
        description="Тижневий і денний перегляд подій"
        actions={
          <>
            <div className="inline-flex rounded-md border bg-muted p-1">
              <button onClick={() => setView("week")}
                className={cn("rounded px-3 py-1 text-sm", view === "week" ? "bg-background shadow-sm" : "text-muted-foreground")}>
                Тиждень
              </button>
              <button onClick={() => setView("day")}
                className={cn("rounded px-3 py-1 text-sm", view === "day" ? "bg-background shadow-sm" : "text-muted-foreground")}>
                День
              </button>
            </div>
            {view === "day" && (
              <select value={day} onChange={(e) => setDay(+e.target.value as DayOfWeek)}
                className="rounded-md border bg-background px-3 py-1 text-sm">
                {([1,2,3,4,5,6,7] as DayOfWeek[]).map((d) => <option key={d} value={d}>{DAYS_UK[d]}</option>)}
              </select>
            )}
            <Button onClick={() => setDialog({ open: true })} className="gap-2">
              <Plus className="h-4 w-4" /> Нова подія
            </Button>
          </>
        }
      />

      {events.isLoading ? <LoadingState /> :
        events.error ? <ErrorState error={events.error} retry={() => events.refetch()} /> :
        (events.data?.length ?? 0) === 0 ? (
          <EmptyState title="Поки немає подій"
            description="Створіть першу подію — урок або одиночну подію."
            action={<Button onClick={() => setDialog({ open: true })}>Створити подію</Button>} />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
              <div className="border-b border-r p-2 text-xs text-muted-foreground">Год</div>
              {days.map((d) => (
                <div key={d} className="border-b p-2 text-center text-sm font-medium">{DAYS_UK[d]}</div>
              ))}
              {HOURS.map((h) => (
                <>
                  <div key={`h-${h}`} className="border-r border-b p-2 text-xs text-muted-foreground">{String(h).padStart(2,"0")}:00</div>
                  {days.map((d) => {
                    const items = (byDay.get(d) ?? []).filter((e) => {
                      const t = e.type === "lesson" ? e.startTime : e.triggerTime;
                      return parseInt(t.slice(0,2), 10) === h;
                    });
                    return (
                      <div key={`c-${h}-${d}`} className="min-h-16 border-b border-r/0 border-l p-1.5">
                        <div className="space-y-1">
                          {items.map((e) => (
                            <button key={e.id} onClick={() => setDialog({ open: true, editing: e })}
                              className={cn(
                                "w-full rounded-md border px-2 py-1.5 text-left text-xs transition hover:shadow-sm",
                                e.enabled ? "border-primary/30 bg-primary/10" : "border-muted bg-muted/40 opacity-60",
                              )}>
                              <div className="font-mono text-[11px] text-primary">
                                {e.type === "lesson" ? `${e.startTime}–${e.endTime}` : e.triggerTime}
                              </div>
                              <div className="truncate font-medium">
                                {e.type === "lesson" ? (e.label ?? "Урок") : e.label}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )
      }

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, editing: o ? dialog.editing : undefined })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Редагувати подію" : "Нова подія"}</DialogTitle>
          </DialogHeader>
          <EventForm
            initial={dialog.editing}
            sounds={sounds.data ?? []}
            events={events.data ?? []}
            onSubmit={handleSubmit}
            onCancel={() => setDialog({ open: false })}
            submitting={create.isPending || update.isPending}
          />
          {dialog.editing && (
            <div className="mt-2 border-t pt-3 text-right">
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                Видалити подію
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
