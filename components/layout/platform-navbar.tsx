"use client";

import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { navItemsForRole } from "@/lib/rbac";
import { useAlertStore, useAuthStore } from "@/store";
import type { UserRole } from "@/types";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

interface PlatformNavbarProps {
  role: UserRole;
}

export function PlatformNavbar({ role }: PlatformNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const unreadCount = useAlertStore((state) => state.unreadCount);
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200"
            aria-label="Toggle menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
          <Link href="/dashboard" className="truncate text-sm font-semibold text-slate-100">
            {t("common.platformName")}
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
        />
      ) : null}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-30 w-72 border-r border-slate-800 bg-slate-950/95 p-4 backdrop-blur transition-transform md:sticky md:flex md:h-screen md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:!translate-x-0`}
      >
        <div className="flex h-full w-full flex-col">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100"
          >
            {t("common.platformName")}
          </Link>

          <nav className="mt-4 flex flex-col gap-1.5">
            {navItemsForRole(role).map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "border border-brand-600/40 bg-brand-600/15 text-slate-100"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="hidden items-center gap-2 md:flex">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
            <span className="block rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">
              {t("common.role")}: {t(`roleTitle.${role}`)}
            </span>
            <Link
              href="/alerts"
              onClick={() => setMobileOpen(false)}
              className="block rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
            >
              {t("common.alerts")}: {unreadCount}
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                logout();
                router.replace("/login");
              }}
              className="w-full rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-slate-700"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
