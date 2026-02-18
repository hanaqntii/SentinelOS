import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authApi } from "@/services/api";
import type { User, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  loginAs: (role: UserRole) => Promise<void>;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      loginAs: async (role) => {
        set({ isLoading: true });
        const response = await authApi.loginAs(role);
        set({ user: response.data, isAuthenticated: true, isLoading: false });
      },
      logout: () => set({ user: null, isAuthenticated: false }),
      setHasHydrated: (value) => set({ hasHydrated: value })
    }),
    {
      name: "iot-health-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
