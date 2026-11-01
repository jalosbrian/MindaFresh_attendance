// shared/utils/attendanceTime.js  (owner: Brian / Attendance)
// Time helpers used only by attendanceService. Kept in its own file so it
// never collides with the group's existing shared/utils/dates.js.
// All times are Asia/Manila (+08:00).

const TZ = "Asia/Manila";

/** Today (or any Date) as YYYY-MM-DD in Manila time. */
export function todayYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Day of week for a YYYY-MM-DD: 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(ymd) {
  return new Date(`${ymd}T12:00:00+08:00`).getUTCDay();
}

/** A Date for "HH:MM" on a given YYYY-MM-DD, in Manila time. */
export function shiftBoundary(ymd, hhmm) {
  return new Date(`${ymd}T${hhmm}:00+08:00`);
}

/** Whole minutes after shift start. 0 if on time or early. */
export function lateMinutes(timeIn, ymd, shiftStart = "08:00") {
  const diff = Math.floor((timeIn - shiftBoundary(ymd, shiftStart)) / 60000);
  return Math.max(0, diff);
}

/** Whole minutes left before shift end when timing out. 0 if on/after time. */
export function undertimeMinutes(timeOut, ymd, shiftEnd = "17:00") {
  const diff = Math.floor((shiftBoundary(ymd, shiftEnd) - timeOut) / 60000);
  return Math.max(0, diff);
}

/** Hours worked = (out - in) - lunch, never below 0, capped at maxRegular. */
export function hoursWorked(timeIn, timeOut, lunchHours = 1, maxRegular = 8) {
  const span = (timeOut - timeIn) / 3600000;
  const net = Math.max(0, span - lunchHours);
  return Math.round(Math.min(net, maxRegular) * 100) / 100;
}

/** "08:25 AM" style label for screens. */
export function timeLabel(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

/** "08:25" (24-hour) for <input type="time"> fields. */
export function hhmm(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}
