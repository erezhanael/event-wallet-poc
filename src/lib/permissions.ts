export const checkInPermissions = {
  "checkin.scan_ticket": true,
  "checkin.assign_nfc": true,
  "checkin.replace_nfc": true,
  "checkin.activate_wallet": true,
  "checkin.view_attendee": true,
  "checkin.topup_wallet": false,
  "checkin.refund": false,
} as const;

export type CheckInPermission = keyof typeof checkInPermissions;
