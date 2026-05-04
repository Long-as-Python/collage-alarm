import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});
