import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Music, Plus, Search, Sparkles, Trash2, Pencil, Play } from "lucide-react";
import { useCreateSound, useDeleteSound, useSounds, useUpdateSound } from "@/shared/api/hooks";
import { airRaidService } from "@/shared/api/services";
import { PageHeader, LoadingState, EmptyState } from "@/shared/ui/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SoundItem } from "@/shared/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sounds")({ component: SoundsPage });

function SoundsPage() {
  const sounds = useSounds();
  const create = useCreateSound();
  const update = useUpdateSound();
  const remove = useDeleteSound();

  const [q, setQ] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [editing, setEditing] = useState<SoundItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<SoundItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    sounds.data?.forEach((x) => x.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [sounds.data]);

  const filtered = useMemo(() => {
    return (sounds.data ?? []).filter((s) => {
      if (!s.isCustom) return false;
      if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (activeTags.length && !activeTags.every((t) => s.tags.includes(t))) return false;
      return true;
    });
  }, [sounds.data, q, activeTags]);

  return (
    <div className="space-y-6">
      <PageHeader title="Бібліотека звуків"
        description="Стандартні та кастомні звуки з тегами"
        actions={<Button onClick={() => setAdding(true)} className="gap-2"><Plus className="h-4 w-4" /> Додати звук</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Пошук за назвою…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => {
            const active = activeTags.includes(t);
            return (
              <button key={t} onClick={() => setActiveTags((a) => active ? a.filter((x) => x !== t) : [...a, t])}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                )}>#{t}</button>
            );
          })}
        </div>
      )}

      {sounds.isLoading ? <LoadingState /> :
        filtered.length === 0 ? <EmptyState icon={Music} title="Звуків не знайдено" description="Спробуйте додати власний звук." /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Music className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 font-medium">
                        {s.name}
                        {s.isCustom && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.tags.map((t) => <Badge key={t} variant="secondary" className="text-[11px]">#{t}</Badge>)}
                  {s.tags.length === 0 && <span className="text-xs text-muted-foreground">без тегів</span>}
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button size="icon" variant="ghost" disabled={playingId === s.id}
                    onClick={async () => {
                      setPlayingId(s.id);
                      try {
                        await airRaidService.playSound(s.id);
                        toast.success("Звук відтворено");
                      } catch {
                        toast.error("Не вдалось відтворити звук");
                      } finally {
                        setPlayingId(null);
                      }
                    }} aria-label="Відтворити">
                    <Play className="h-4 w-4" />
                  </Button>
                  {s.isCustom && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(s)} aria-label="Редагувати">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleting(s)} aria-label="Видалити">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      <SoundDialog
        open={adding} onOpenChange={setAdding}
        onSubmit={async (v) => {
          try {
            await create.mutateAsync(v);
            toast.success("Звук додано");
            setAdding(false);
          } catch (e: any) {
            toast.error(e?.message ?? "Не вдалось додати звук");
          }
        }}
      />
      <SoundDialog
        open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}
        initial={editing ?? undefined}
        onSubmit={async (v) => {
          if (!editing) return;
          try {
            await update.mutateAsync({ id: editing.id, patch: v });
            toast.success("Збережено");
            setEditing(null);
          } catch (e: any) {
            toast.error(e?.message ?? "Не вдалось зберегти зміни");
          }
        }}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити звук "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Дія незворотна. Події, що використовують цей звук, потрібно буде оновити.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await remove.mutateAsync(deleting!.id);
                setDeleting(null);
                toast.success("Звук видалено");
              } catch (e: any) {
                toast.error(e?.message ?? "Не вдалось видалити звук");
              }
            }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SoundDialog({
  open, onOpenChange, initial, onSubmit,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  initial?: SoundItem;
  onSubmit: (v: { name: string; description?: string; tags: string[]; file?: File }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // sync on open
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setTagsStr(initial?.tags.join(", ") ?? "");
      setFile(null);
    }
  }, [open, initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Введіть назву"); return; }
    if (!initial && !file) { toast.error("Оберіть файл звуку"); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        file: file ?? undefined,
      });
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Редагувати звук" : "Новий кастомний звук"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Назва</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Дзвоник …" />
          </div>
          <div>
            <Label>Опис</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Теги (через кому)</Label>
            <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="дзвоник, урок" />
          </div>
          {!initial && (
            <div>
              <Label>Файл звуку</Label>
              <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={submitting}>{initial ? "Зберегти" : "Додати"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
