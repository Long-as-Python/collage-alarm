import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Music, Search, Sparkles, X } from "lucide-react";
import type { SoundItem } from "@/shared/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface SoundSelectProps {
  sounds: SoundItem[];
  value: string | null | undefined;
  onChange: (id: string) => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
}

/** Universal sound dropdown with search, tag filter and mini preview. */
export function SoundSelect({
  sounds, value, onChange, placeholder = "Оберіть звук", invalid, ariaLabel,
}: SoundSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    sounds.forEach((x) => x.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [sounds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sounds.filter((s) => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
      const matchTags = activeTags.length === 0 || activeTags.every((t) => s.tags.includes(t));
      return matchQ && matchTags;
    });
  }, [sounds, search, activeTags]);

  const grouped = useMemo(() => ({
    custom: filtered.filter((s) => s.isCustom),
    base: filtered.filter((s) => !s.isCustom),
  }), [filtered]);

  const selected = sounds.find((s) => s.id === value);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function preview(s: SoundItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (audioRef.current.src && !audioRef.current.paused) {
      audioRef.current.pause();
      return;
    }
    // Mock preview: silent ping using oscillator-free fallback.
    audioRef.current.src = s.fileUrl || "";
    audioRef.current.play().catch(() => {});
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition",
          "hover:border-ring/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          invalid ? "border-destructive" : "border-input",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Music className="h-4 w-4 text-muted-foreground" />
          {selected ? (
            <span className="truncate">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selected?.isCustom && <Sparkles className="h-3.5 w-3.5 text-primary" />}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук звуку або тега…" className="pl-8 h-9"
            />
          </div>

          {allTags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {allTags.map((t) => {
                const active = activeTags.includes(t);
                return (
                  <button key={t} type="button"
                    onClick={() => setActiveTags((a) => active ? a.filter((x) => x !== t) : [...a, t])}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs transition",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
                    )}
                  >#{t}</button>
                );
              })}
              {activeTags.length > 0 && (
                <button type="button" onClick={() => setActiveTags([])}
                  className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                  <X className="inline h-3 w-3" /> очистити
                </button>
              )}
            </div>
          )}

          <div className="max-h-64 overflow-auto" role="listbox">
            {filtered.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">Звуки не знайдено</div>
            )}
            {grouped.custom.length > 0 && (
              <Group title="Кастомні" items={grouped.custom} value={value} onChange={(id) => { onChange(id); setOpen(false); }} onPreview={preview} />
            )}
            {grouped.base.length > 0 && (
              <Group title="Стандартні" items={grouped.base} value={value} onChange={(id) => { onChange(id); setOpen(false); }} onPreview={preview} />
            )}
          </div>
          <audio ref={audioRef} hidden />
        </div>
      )}
    </div>
  );
}

function Group({
  title, items, value, onChange, onPreview,
}: {
  title: string; items: SoundItem[]; value: string | null | undefined;
  onChange: (id: string) => void;
  onPreview: (s: SoundItem, e: React.MouseEvent) => void;
}) {
  return (
    <div className="mb-1">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {items.map((s) => {
        const sel = value === s.id;
        return (
          <div key={s.id} role="option" aria-selected={sel}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
              sel && "bg-accent",
            )}
          >
            <Check className={cn("h-4 w-4", sel ? "opacity-100" : "opacity-0")} />
            <span className="flex-1 truncate">{s.name}</span>
            <div className="flex flex-wrap gap-1">
              {s.tags.slice(0, 2).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
              onClick={(e) => onPreview(s, e)} aria-label={`Прев'ю ${s.name}`}>
              <Music className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
