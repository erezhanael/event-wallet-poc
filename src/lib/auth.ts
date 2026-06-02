import type { UserRole } from "./types";

export const roleHome: Record<UserRole, string> = {
  attendee: "/attendee/events",
  bartender: "/bartender",
  checkin: "/check-in",
  organizer: "/organizer/dashboard",
  vendor: "/vendor",
};

export function roleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/attendee")) return "attendee";
  if (pathname.startsWith("/bartender")) return "bartender";
  if (pathname.startsWith("/check-in")) return "checkin";
  if (pathname.startsWith("/organizer")) return "organizer";
  if (pathname.startsWith("/vendor")) return "vendor";
  return null;
}

export function isUserRole(value: string | undefined): value is UserRole {
  return value === "attendee" || value === "bartender" || value === "checkin" || value === "organizer" || value === "vendor";
}
