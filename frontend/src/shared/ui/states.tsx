import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = "Завантаження…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({
  title, description, action, icon: Icon,
}: { title: string; description?: string; action?: React.ReactNode; icon?: React.ComponentType<any> }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-10 w-10 text-muted-foreground" />}
      <h3 className="text-base font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Сталася помилка";
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">{msg}</p>
      {retry && (
        <button onClick={retry} className="mt-2 text-sm underline text-destructive">Спробувати знову</button>
      )}
    </div>
  );
}

export function StatTile({
  label, value, hint, tone = "default",
}: { label: string; value: React.ReactNode; hint?: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const toneCls = {
    default: "bg-card",
    success: "bg-success/10 border-success/30",
    warning: "bg-warning/10 border-warning/30",
    danger: "bg-danger/10 border-danger/30",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-4", toneCls)}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
