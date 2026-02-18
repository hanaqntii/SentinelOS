"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { canAccessPlatformRoute } from "@/lib/rbac";
import { PlatformNavbar } from "@/components/layout/platform-navbar";
import { useAuthStore } from "@/store";

interface PlatformShellProps {
  children: React.ReactNode;
}

export function PlatformShell({ children }: PlatformShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    if (!canAccessPlatformRoute(user.role, pathname)) {
      router.replace("/unauthorized");
    }
  }, [hasHydrated, isAuthenticated, pathname, router, user]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t("common.loadingSession")}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!canAccessPlatformRoute(user.role, pathname)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 md:flex">
      <PlatformNavbar role={user.role} />
      <main className="min-w-0 flex-1 overflow-x-hidden pt-14 md:pt-0">
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-4">{children}</div>
      </main>
    </div>
  );
}
