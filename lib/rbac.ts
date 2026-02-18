import type { UserRole } from "@/types";

export const PLATFORM_NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/devices", labelKey: "nav.devices" },
  { href: "/alerts", labelKey: "nav.alerts" },
  { href: "/map", labelKey: "nav.map" },
  { href: "/analytics", labelKey: "nav.analytics" },
  { href: "/settings", labelKey: "nav.settings" }
] as const;

const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin: ["/dashboard", "/devices", "/alerts", "/map", "/analytics", "/settings", "/unauthorized"],
  operator: ["/dashboard", "/devices", "/alerts", "/map", "/analytics", "/unauthorized"],
  viewer: ["/dashboard", "/devices", "/alerts", "/map", "/analytics", "/unauthorized"]
};

export type PermissionAction =
  | "alerts.acknowledge"
  | "devices.register"
  | "devices.control"
  | "settings.manage";

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: ["alerts.acknowledge", "devices.register", "devices.control", "settings.manage"],
  operator: ["alerts.acknowledge", "devices.control"],
  viewer: []
};

const normalizePlatformPath = (pathname: string): string => {
  if (pathname.startsWith("/devices/")) {
    return "/devices";
  }

  return pathname;
};

export const canAccessPlatformRoute = (role: UserRole, pathname: string): boolean => {
  const route = normalizePlatformPath(pathname);
  return ROLE_ACCESS[role].includes(route);
};

export const navItemsForRole = (role: UserRole) =>
  PLATFORM_NAV_ITEMS.filter((item) => canAccessPlatformRoute(role, item.href));

export const canPerformAction = (role: UserRole, action: PermissionAction): boolean =>
  ROLE_PERMISSIONS[role].includes(action);
