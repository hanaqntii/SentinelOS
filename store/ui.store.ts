import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Locale = "en" | "fa";
export type ThemeMode = "dark" | "light";

interface UiState {
  locale: Locale;
  theme: ThemeMode;
  hasHydrated: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      locale: "en",
      theme: "dark",
      hasHydrated: false,
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === "en" ? "fa" : "en" }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setHasHydrated: (value) => set({ hasHydrated: value })
    }),
    {
      name: "iot-health-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        locale: state.locale,
        theme: state.theme
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
