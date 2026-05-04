import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, User } from "lucide-react";
import { useAuthStore } from "@/modules/auth/store";
import { authService } from "@/shared/api/services";
import { PageHeader } from "@/shared/ui/states";
import { Button } from "@/components/ui/button";
import { dayjs } from "@/shared/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [verified, setVerified] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    let cancelled = false;
    authService.verify().then((v) => { if (!cancelled) setVerified(v ? "ok" : "fail"); })
      .catch(() => { if (!cancelled) setVerified("fail"); });
    return () => { cancelled = true; };
  }, []);

  async function onLogout() {
    await authService.logout();
    logout();
    toast.success("Ви вийшли з системи");
    navigate({ to: "/login" });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Профіль" description="Інформація про ваш сеанс" />
      <div className="max-w-md space-y-4 rounded-lg border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="font-medium">{session?.username ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Роль: Адміністратор</div>
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className={"h-4 w-4 " + (verified === "ok" ? "text-success" : verified === "fail" ? "text-destructive" : "text-muted-foreground")} />
            Стан сесії: {verified === "loading" ? "перевірка…" : verified === "ok" ? "активна" : "недійсна"}
          </div>
          {session?.expiresAt && (
            <div className="mt-1 text-xs text-muted-foreground">Дійсна до: {dayjs(session.expiresAt).format("D MMMM YYYY, HH:mm")}</div>
          )}
        </div>
        <Button variant="outline" onClick={onLogout} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Вийти
        </Button>
      </div>
    </div>
  );
}
