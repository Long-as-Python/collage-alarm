import { Outlet, createRootRoute, redirect } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useAuthStore } from "@/modules/auth/store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const session = useAuthStore.getState().session;
    if (!session && location.pathname !== "/login") {
      throw redirect({ to: "/login" });
    }
    if (session && location.pathname === "/login") {
      throw redirect({ to: "/" });
    }
  },
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Сторінку не знайдено</p>
        <a href="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">На головну</a>
      </div>
    </div>
  ),
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
