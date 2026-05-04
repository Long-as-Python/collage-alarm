import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Calendar, ListChecks, LogOut, Menu, Music, Radio, Settings,
  Siren, User as UserIcon, X,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/modules/auth/store";
import { authService } from "@/shared/api/services";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import rcitLogo from "@/assets/rcit-logo.svg";

const NAV = [
  { to: "/", label: "Дашборд", icon: Radio },
  { to: "/schedule", label: "Розклад", icon: Calendar },
  { to: "/events", label: "Події", icon: ListChecks },
  { to: "/sounds", label: "Звуки", icon: Music },
  { to: "/air-raid", label: "Повітряні тривоги", icon: Siren },
  { to: "/settings", label: "Налаштування", icon: Settings },
  { to: "/profile", label: "Профіль", icon: UserIcon },
] as const;

export function AppShell() {
  const [open, setOpen] = useState(false);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await authService.logout();
    logout();
    toast.success("Ви вийшли з системи");
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <img src={rcitLogo} alt="RCIT" className="h-6 w-6 rounded-sm object-contain" />
          RCIT
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Меню">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r bg-sidebar transition-transform md:static md:translate-x-0",
        open && "translate-x-0",
      )}>
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <img src={rcitLogo} alt="RCIT" className="h-6 w-6 rounded-sm object-contain" />
          RCIT · Сигнали коледжу
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}>
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-3 bottom-3 rounded-md border bg-card p-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{session?.username ?? "Адмін"}</div>
              <div className="text-xs text-muted-foreground">Адміністратор</div>
            </div>
            <Button size="icon" variant="ghost" onClick={handleLogout} aria-label="Вийти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
