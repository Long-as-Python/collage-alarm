import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserSession } from "@/shared/types";

interface AuthState {
  session: UserSession | null;
  setSession: (s: UserSession | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      logout: () => set({ session: null }),
    }),
    { name: "school-bell-auth" },
  ),
);
