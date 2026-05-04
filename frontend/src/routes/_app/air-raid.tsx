import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Siren, TestTube, RotateCcw } from "lucide-react";
import { useAirRaid, useSaveAirRaid, useSounds } from "@/shared/api/hooks";
import { airRaidService } from "@/shared/api/services";
import { PageHeader, LoadingState } from "@/shared/ui/states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SoundSelect } from "@/shared/ui/SoundSelect";
import { toast } from "sonner";
import type { AirRaidSettings } from "@/shared/types";

export const Route = createFileRoute("/_app/air-raid")({ component: AirRaidPage });

const DEFAULTS: AirRaidSettings = {
  enabled: true, alarmSoundId: null, volume: 80,
  testMode: false, autoPauseSchedule: true, autoResumeSchedule: true,
};

function AirRaidPage() {
  const data = useAirRaid();
  const sounds = useSounds();
  const save = useSaveAirRaid();
  const [s, setS] = useState<AirRaidSettings | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => { if (data.data && !s) setS(data.data); }, [data.data, s]);

  if (data.isLoading || !s) return <LoadingState />;

  function patch(p: Partial<AirRaidSettings>) { setS((cur) => ({ ...(cur as AirRaidSettings), ...p })); }

  async function onSave() {
    if (!s) return;
    if (s.enabled && !s.alarmSoundId) { toast.error("Оберіть звук тривоги"); return; }
    await save.mutateAsync(s);
    toast.success("Налаштування збережено");
  }
  async function onTest() {
    setTesting(true);
    try { await airRaidService.test(); toast.success("Тест тривоги відправлено на API"); }
    catch { toast.error("Не вдалось відправити тест"); }
    finally { setTesting(false); }
  }
  function onReset() { setS(DEFAULTS); toast.info("Скинуто до значень за замовчуванням"); }

  return (
    <div className="space-y-6">
      <PageHeader title="Повітряні тривоги"
        description="Інтеграція з API сповіщень про повітряну тривогу" />

      <div className="rounded-lg border border-danger/30 bg-danger/5 p-5">
        <div className="flex items-start gap-3">
          <Siren className="mt-0.5 h-5 w-5 text-danger" />
          <div className="flex-1">
            <h3 className="font-medium">Сповіщення активне</h3>
            <p className="text-sm text-muted-foreground">При спрацюванні тривоги відтворюватиметься обраний звук.</p>
          </div>
          <Switch checked={s.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h3 className="font-semibold">Звук і гучність</h3>
          <div>
            <Label>Звук тривоги</Label>
            <SoundSelect sounds={sounds.data ?? []} value={s.alarmSoundId} onChange={(id) => patch({ alarmSoundId: id })} placeholder="Оберіть звук тривоги" />
          </div>
          <div>
            <div className="flex justify-between">
              <Label>Гучність</Label>
              <span className="text-sm text-muted-foreground">{s.volume}%</span>
            </div>
            <Slider value={[s.volume]} onValueChange={([v]) => patch({ volume: v })} min={0} max={100} step={5} />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h3 className="font-semibold">Поведінка під час тривоги</h3>
          <Toggle label="Тестовий режим" hint="Не відправляти реальні сигнали" checked={s.testMode} onChange={(v) => patch({ testMode: v })} />
          <Toggle label="Автопауза планувальника" hint="Зупиняти заплановані сигнали" checked={s.autoPauseSchedule} onChange={(v) => patch({ autoPauseSchedule: v })} />
          <Toggle label="Авто-відновлення після відбою" hint="Продовжити розклад автоматично" checked={s.autoResumeSchedule} onChange={(v) => patch({ autoResumeSchedule: v })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="destructive" onClick={onTest} disabled={testing} className="gap-2">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
          Тест тривоги
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2"><RotateCcw className="h-4 w-4" /> Скинути</Button>
        <div className="ml-auto">
          <Button onClick={onSave} disabled={save.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Зберегти
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
