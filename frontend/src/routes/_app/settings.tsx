import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useSaveSystemConfig, useSystemConfig } from "@/shared/api/hooks";
import { PageHeader, LoadingState } from "@/shared/ui/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { SystemConfig, ScheduleType } from "@/shared/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const data = useSystemConfig();
  const save = useSaveSystemConfig();
  const [c, setC] = useState<SystemConfig | null>(null);
  useEffect(() => { if (data.data && !c) setC(data.data); }, [data.data, c]);
  if (!c) return <LoadingState />;

  function patch(p: Partial<SystemConfig>) { setC((cur) => ({ ...(cur as SystemConfig), ...p })); }
  async function onSave() {
    await save.mutateAsync(c!);
    toast.success("Налаштування збережено");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Загальні налаштування" description="Глобальні параметри системи сигналів" />

      <div className="space-y-4 rounded-lg border bg-card p-5">
        <div>
          <Label>Тип розкладу</Label>
          <select value={c.scheduleType} onChange={(e) => patch({ scheduleType: e.target.value as ScheduleType })}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="full">Повний</option>
            <option value="short">Скорочений</option>
            <option value="custom">Індивідуальний</option>
          </select>
        </div>
        <div>
          <div className="flex justify-between">
            <Label>Гучність за замовчуванням</Label>
            <span className="text-sm text-muted-foreground">{c.defaultVolume}%</span>
          </div>
          <Slider value={[c.defaultVolume]} onValueChange={([v]) => patch({ defaultVolume: v })} min={0} max={100} step={5} />
        </div>
        <div>
          <Label>Часовий пояс</Label>
          <Input value={c.timezone} onChange={(e) => patch({ timezone: e.target.value })} placeholder="Europe/Kyiv" />
        </div>
        <label className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Планувальник активний</div>
            <div className="text-xs text-muted-foreground">Відтворювати заплановані сигнали</div>
          </div>
          <Switch checked={c.schedulerEnabled} onCheckedChange={(v) => patch({ schedulerEnabled: v })} />
        </label>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={save.isPending} className="gap-2">
          <Save className="h-4 w-4" /> Зберегти
        </Button>
      </div>
    </div>
  );
}
