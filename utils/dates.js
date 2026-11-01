// shared/utils/dates.js  (owner: Brian, Attendance)
// Manila date helpers. Brian adds isWorkingDay(date) and the attendance helpers.
const TZ = "Asia/Manila";

// "2026-10-30"
export function manilaDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

// "Oct 30, 2026, 11:40 AM"
export function manilaDateTime(d) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  }).format(new Date(d));
}

// Day of week in Manila: 0 = Sunday ... 6 = Saturday
export function manilaWeekday(d = new Date()) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(d));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

// Weekday check only. Brian's version also checks the holidays table.
export function isWorkingDay(date) {
  const workDays = (process.env.WORK_DAYS || "1,2,3,4,5,6").split(",").map(Number);
  return workDays.includes(manilaWeekday(date));
}
