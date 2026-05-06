import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, AlertTriangle, Clock, Flame, Pause, Play, Volume2 } from "lucide-react";
import { useAirRaid, useCurrentState, useEvents, useSounds, useSystemConfig, useSaveSystemConfig } from "@/shared/api/hooks";
import { airRaidService } from "@/shared/api/services";
import { PageHeader, StatTile, LoadingState } from "@/shared/ui/states";
import { Button } from "@/components/ui/button";
import { dayjs, DAYS_FULL_UK } from "@/shared/utils";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const current = useCurrentState();
  const events = useEvents();
  const sounds = useSounds();
  const config = useSystemConfig();
  const airRaid = useAirRaid();
  const saveConfig = useSaveSystemConfig();
  const [confirmFire, setConfirmFire] = useState(false);

  const today = dayjs();
  const todayDow = ((today.day() === 0 ? 7 : today.day())) as number;
  const nowTime = today.format("HH:mm");
  const allTodays = (events.data ?? []).filter((e) => e.daysOfWeek.includes(todayDow as any) && e.enabled);
  const todays = allTodays
    .filter((e) => {
      const cutoff = e.type === "lesson" ? e.endTime : e.triggerTime;
      return cutoff >= nowTime;
    })
    .sort((a, b) => {
      const at = a.type === "lesson" ? a.startTime : a.triggerTime;
      const bt = b.type === "lesson" ? b.startTime : b.triggerTime;
      return at.localeCompare(bt);
    });

  async function fireAlarm() {
    setConfirmFire(false);
    try {
      await airRaidService.fire();
      toast.success("Пожежну тривогу запущено");
    } catch { toast.error("Помилка запуску тривоги"); }
  }

  async function testSound() {
    try {
      await airRaidService.playSound("bell");
      toast.success("Тестовий сигнал відтворено");
    } catch {
      toast.error("Не вдалось відтворити звук");
    }
  }

  async function toggleScheduler() {
    if (!config.data) return;
    const next = !config.data.schedulerEnabled;
    await saveConfig.mutateAsync({ ...config.data, schedulerEnabled: next });
    toast.success(next ? "Планувальник увімкнено" : "Планувальник зупинено");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд"
        description={`${DAYS_FULL_UK[todayDow]}, ${today.format("D MMMM YYYY")}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Поточний час" value={today.format("HH:mm:ss")} hint={config.data?.timezone} />
        <StatTile
          label="Планувальник"
          value={config.data?.schedulerEnabled ? "Активний" : "Зупинено"}
          tone={config.data?.schedulerEnabled ? "success" : "warning"}
          hint={`Режим: ${config.data?.scheduleType ?? "—"}`}
        />
        <StatTile
          label="Повітряні тривоги"
          value={airRaid.data?.enabled ? "Увімкнено" : "Вимкнено"}
          tone={airRaid.data?.enabled ? "success" : "default"}
        />
        <StatTile
          label="Залишилось сьогодні"
          value={todays.length}
          hint={`Всього: ${allTodays.length}`}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-primary" /> Хронологія на сьогодні
          </h2>
          {events.isLoading ? <LoadingState /> : todays.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Немає подій на сьогодні</p>
          ) : (
            <ol className="space-y-2">
              {todays.map((e) => {
                const time = e.type === "lesson" ? `${e.startTime}–${e.endTime}` : e.triggerTime;
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-md border bg-background p-3">
                    <div className="font-mono text-sm tabular-nums text-primary">{time}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{e.type === "lesson" ? (e.label ?? "Урок") : e.label}</div>
                      <div className="text-xs text-muted-foreground">{e.type === "lesson" ? "Урок" : "Одиночна подія"}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-5 w-5 text-primary" /> Швидкі дії
          </h2>
          <div className="space-y-2">
            <Button variant="destructive" className="w-full justify-start gap-2"
              onClick={() => setConfirmFire(true)}>
              <Flame className="h-4 w-4" /> Пожежна тривога
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={testSound}>
              <Volume2 className="h-4 w-4" /> Тест звуку
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={toggleScheduler}>
              {config.data?.schedulerEnabled
                ? <><Pause className="h-4 w-4" /> Зупинити планувальник</>
                : <><Play className="h-4 w-4" /> Увімкнути планувальник</>}
            </Button>
            <Link to="/air-raid" className="block">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-foreground" /> Налаштувати тривогу
              </Button>
            </Link>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            У бібліотеці: {sounds.data?.length ?? 0} звуків
          </div>
        </div>
      </section>

      <AlertDialog open={confirmFire} onOpenChange={setConfirmFire}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Запустити пожежну тривогу?</AlertDialogTitle>
            <AlertDialogDescription>
              Сигнал пролунає для всієї будівлі. Використовуйте лише в надзвичайних ситуаціях.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={fireAlarm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Так, запустити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
