import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  airRaidService, eventsService, soundsService, systemService,
} from "@/shared/api/services";
import type { AirRaidSettings, ScheduleEvent, SoundItem, SystemConfig, LessonEvent, SingleEvent } from "@/shared/types";

export const qk = {
  sounds: ["sounds"] as const,
  events: ["events"] as const,
  airRaid: ["air-raid"] as const,
  config: ["system", "config"] as const,
  current: ["system", "current"] as const,
};

export function useSounds() {
  return useQuery({ queryKey: qk.sounds, queryFn: soundsService.list });
}
export function useCreateSound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: soundsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sounds }),
  });
}
export function useUpdateSound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SoundItem> }) => soundsService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sounds }),
  });
}
export function useDeleteSound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: soundsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sounds }),
  });
}

export function useEvents() {
  return useQuery({ queryKey: qk.events, queryFn: eventsService.list });
}
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (e: Omit<LessonEvent, "id"> | Omit<SingleEvent, "id">) => eventsService.create(e),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}
export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ScheduleEvent> }) => eventsService.update(id, patch),
    // Optimistic update
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.events });
      const prev = qc.getQueryData<ScheduleEvent[]>(qk.events);
      if (prev) {
        qc.setQueryData<ScheduleEvent[]>(qk.events, prev.map((e) => e.id === id ? ({ ...e, ...patch } as ScheduleEvent) : e));
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(qk.events, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eventsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}
export function useBulkUpdateEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: Partial<ScheduleEvent> }) => eventsService.bulkUpdate(ids, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}
export function useBulkDeleteEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eventsService.bulkRemove,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

export function useAirRaid() {
  return useQuery({ queryKey: qk.airRaid, queryFn: airRaidService.get });
}
export function useSaveAirRaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: AirRaidSettings) => airRaidService.save(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.airRaid }),
  });
}

export function useSystemConfig() {
  return useQuery({ queryKey: qk.config, queryFn: systemService.getConfig });
}
export function useSaveSystemConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: SystemConfig) => systemService.saveConfig(c),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.config }),
  });
}
export function useCurrentState() {
  return useQuery({ queryKey: qk.current, queryFn: systemService.getCurrent, refetchInterval: 5000 });
}
