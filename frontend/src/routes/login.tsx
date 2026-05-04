import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/shared/api/services";
import { useAuthStore } from "@/modules/auth/store";
import { toast } from "sonner";
import rcitLogo from "@/assets/rcit-logo.svg";

const schema = z.object({
  username: z.string().min(2, "Мінімум 2 символи"),
  password: z.string().min(3, "Мінімум 3 символи"),
  remember: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { username: "admin", password: "admin", remember: true },
  });

  async function onSubmit(values: Form) {
    setSubmitting(true);
    try {
      const session = await authService.adminLogin(values.username, values.password);
      setSession(session);
      toast.success("Ласкаво просимо!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалось увійти");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary to-primary/70 p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <img src={rcitLogo} alt="RCIT" className="h-7 w-7 rounded-sm object-contain" /> RCIT
        </div>
        <div>
          <h2 className="text-4xl font-semibold leading-tight">Керуйте розкладом, звуками і тривогами в одному місці.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Швидке створення подій, бібліотека власних звуків і інтеграція повітряних тривог.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© RCIT · Адмін панель коледжу</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-sm space-y-5">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-semibold">Вхід в адмін панель</h1>
            <p className="mt-1 text-sm text-muted-foreground">Увійдіть, щоб керувати системою сигналів.</p>
          </div>
          <div>
            <Label htmlFor="username">Логін</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="username" autoComplete="username" className="pl-9" {...form.register("username")} />
            </div>
            {form.formState.errors.username && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.username.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" autoComplete="current-password" className="pl-9" {...form.register("password")} />
            </div>
            {form.formState.errors.password && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch("remember")}
              onCheckedChange={(v) => form.setValue("remember", !!v)}
            />
            Запам'ятати мене
          </label>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Увійти
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Демо: будь-який логін / пароль ≥ 3 символів
          </p>
        </form>
      </div>
    </div>
  );
}
