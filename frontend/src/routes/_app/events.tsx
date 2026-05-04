import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  useBulkDeleteEvents, useBulkUpdateEvents, useCreateEvent,
  useEvents, useSounds, useUpdateEvent, useDeleteEvent,
} from "@/shared/api/hooks";
import { PageHeader, LoadingState, EmptyState } from "@/shared/ui/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventForm } from "@/modules/events/components/EventForm";
import { DAYS_UK } from "@/shared/utils";
import type { ScheduleEvent, DayOfWeek, EventType, SoundItem } from "@/shared/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/events")({ component: EventsPage });

function EventsPage() {
  const events = useEvents();
  const sounds = useSounds();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();
  const bulkUpdate = useBulkUpdateEvents();
  const bulkDelete = useBulkDeleteEvents();

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [filterDay, setFilterDay] = useState<DayOfWeek | "all">("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ open: boolean; editing?: ScheduleEvent }>({ open: false });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    sounds.data?.forEach((x) => x.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [sounds.data]);

  const soundById = useMemo(() => {
    const m = new Map<string, SoundItem>();
    sounds.data?.forEach((s) => m.set(s.id, s));
    return m;
  }, [sounds.data]);

  const filtered = useMemo(() => {
    return (events.data ?? []).filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterDay !== "all" && !e.daysOfWeek.includes(filterDay)) return false;
      const ids = e.type === "lesson" ? [e.startSoundId, e.endSoundId] : [e.soundId];
      const tags = ids.flatMap((id) => soundById.get(id)?.tags ?? []);
      if (filterTag !== "all" && !tags.includes(filterTag)) return false;
      if (q) {
        const label = e.type === "lesson" ? (e.label ?? "Урок") : e.label;
        if (!label.toLowerCase().includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [events.data, filterType, filterDay, filterTag, q, soundById]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((e) => e.id)));
  }

  async function handleSubmit(values: any) {
    if (dialog.editing) {
      await update.mutateAsync({ id: dialog.editing.id, patch: values });
      toast.success("Подію оновлено");
    } else {
      await create.mutateAsync(values);
      toast.success("Подію створено");
    }
    setDialog({ open: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Події" description="Перегляд, фільтрація та масові дії"
        actions={<Button onClick={() => setDialog({ open: true })} className="gap-2"><Plus className="h-4 w-4" /> Нова подія</Button>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Пошук за назвою…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
          className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="all">Усі типи</option>
          <option value="lesson">Урок</option>
          <option value="single">Одиночна</option>
        </select>
        <select value={filterDay} onChange={(e) => setFilterDay(e.target.value === "all" ? "all" : (+e.target.value as DayOfWeek))}
          className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="all">Усі дні</option>
          {([1,2,3,4,5,6,7] as DayOfWeek[]).map((d) => <option key={d} value={d}>{DAYS_UK[d]}</option>)}
        </select>
        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-1">
          <option value="all">Усі теги звуку</option>
          {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-accent/50 p-3 text-sm">
          <span className="font-medium">Вибрано: {selected.size}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm"
              onClick={async () => { await bulkUpdate.mutateAsync({ ids: [...selected], patch: { enabled: true } }); setSelected(new Set()); toast.success("Увімкнено"); }}>
              <ToggleRight className="mr-1 h-4 w-4" /> Увімкнути
            </Button>
            <Button variant="outline" size="sm"
              onClick={async () => { await bulkUpdate.mutateAsync({ ids: [...selected], patch: { enabled: false } }); setSelected(new Set()); toast.success("Вимкнено"); }}>
              <ToggleLeft className="mr-1 h-4 w-4" /> Вимкнути
            </Button>
            <Button variant="destructive" size="sm"
              onClick={async () => { await bulkDelete.mutateAsync([...selected]); setSelected(new Set()); toast.success("Видалено"); }}>
              <Trash2 className="mr-1 h-4 w-4" /> Видалити
            </Button>
          </div>
        </div>
      )}

      {events.isLoading ? <LoadingState /> :
        filtered.length === 0 ? <EmptyState title="Подій не знайдено" description="Змініть фільтри або створіть нову подію." /> : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 p-3"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                  <th className="p-3">Назва</th>
                  <th className="p-3">Тип</th>
                  <th className="p-3">Час</th>
                  <th className="p-3">Дні</th>
                  <th className="p-3">Звуки</th>
                  <th className="p-3">Стан</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const sIds = e.type === "lesson" ? [e.startSoundId, e.endSoundId] : [e.soundId];
                  return (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3"><Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} /></td>
                      <td className="p-3">
                        <button className="font-medium text-left hover:underline" onClick={() => setDialog({ open: true, editing: e })}>
                          {e.type === "lesson" ? (e.label ?? "Урок") : e.label}
                        </button>
                      </td>
                      <td className="p-3"><Badge variant="secondary">{e.type === "lesson" ? "Урок" : "Одиночна"}</Badge></td>
                      <td className="p-3 font-mono tabular-nums">{e.type === "lesson" ? `${e.startTime}–${e.endTime}` : e.triggerTime}</td>
                      <td className="p-3 text-xs">{e.daysOfWeek.map((d) => DAYS_UK[d]).join(", ")}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {sIds.map((id) => soundById.get(id)?.name ?? "—").join(" / ")}
                      </td>
                      <td className="p-3">
                        {e.enabled
                          ? <Badge className="bg-success text-success-foreground">Активна</Badge>
                          : <Badge variant="outline">Вимкнена</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, editing: o ? dialog.editing : undefined })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{dialog.editing ? "Редагувати подію" : "Нова подія"}</DialogTitle></DialogHeader>
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
              <Button variant="ghost" className="text-destructive hover:text-destructive"
                onClick={async () => { await remove.mutateAsync(dialog.editing!.id); toast.success("Подію видалено"); setDialog({ open: false }); }}>
                Видалити
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
