import type { UserRole } from "./types";

export const roleHome: Record<UserRole, string> = {
  attendee: "/attendee/events",
  bartender: "/bartender",
  organizer: "/organizer/dashboard",
};

export function roleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/attendee")) return "attendee";
  if (pathname.startsWith("/bartender")) return "bartender";
  if (pathname.startsWith("/organizer")) return "organizer";
  return null;
}

export function isUserRole(value: string | undefined): value is UserRole {
  return value === "attendee" || value === "bartender" || value === "organizer";
}
