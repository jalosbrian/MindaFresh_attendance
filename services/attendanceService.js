// shared/services/attendanceService.js  (owner: Brian, Attendance)
//
// Attendance only WRITES to attendance_logs. It only READS employees,
// leave_requests and holidays. Real schema: shared/database/schema.sql.
// attendance_logs links to employees by employee_id (not employee_code).
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { AttendanceLog } from "../models/AttendanceLog.js";
import {
  todayYmd,
  dayOfWeek,
  shiftBoundary,
  lateMinutes,
  undertimeMinutes,
  hoursWorked,
} from "../utils/attendanceTime.js";

const SHIFT_START = process.env.SHIFT_START || "08:00";
const SHIFT_END = process.env.SHIFT_END || "17:00";
const LUNCH_HOURS = Number(process.env.LUNCH_HOURS || 1);
const MAX_REGULAR_HOURS = Number(process.env.MAX_REGULAR_HOURS || 8);
// Days end-of-day marking runs (0 = Sun ... 6 = Sat). Change in .env.
const WORK_DAYS = (process.env.WORK_DAYS || "1,2,3,4,5,6")
  .split(",")
  .map((n) => Number(n.trim()));

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const clean = (code) => String(code || "").trim().toUpperCase();

/* ------------------------------ HR READS ------------------------------ */

async function findEmployee(employeeCode) {
  const rows = await sequelize.query(
    `SELECT id, employee_code, first_name, last_name, status
       FROM employees
      WHERE employee_code = :code
      LIMIT 1`,
    { replacements: { code: employeeCode }, type: QueryTypes.SELECT }
  );
  return rows[0] || null;
}

async function activeEmployee(rawCode) {
  const code = clean(rawCode);
  if (!code) throw fail(400, "Please enter your employee code.");
  const employee = await findEmployee(code);
  if (!employee) throw fail(404, "Employee not found.");
  if (employee.status !== "active") throw fail(403, "Employee is not active.");
  return employee;
}

async function isHoliday(ymd) {
  const rows = await sequelize.query(
    `SELECT name FROM holidays WHERE holiday_date = :d LIMIT 1`,
    { replacements: { d: ymd }, type: QueryTypes.SELECT }
  );
  return rows[0] || null;
}

// Active employees (already hired) with NO log on :d, plus approved-leave flag.
async function employeesWithoutLog(ymd) {
  return sequelize.query(
    `SELECT e.id,
            EXISTS (
              SELECT 1 FROM leave_requests lr
               WHERE lr.employee_id = e.id
                 AND lr.status = 'approved'
                 AND :d BETWEEN lr.start_date AND lr.end_date
            ) AS has_leave
       FROM employees e
      WHERE e.status = 'active'
        AND e.hire_date <= :d
        AND NOT EXISTS (
              SELECT 1 FROM attendance_logs a
               WHERE a.employee_id = e.id AND a.log_date = :d
            )`,
    { replacements: { d: ymd }, type: QueryTypes.SELECT }
  );
}

/* ----------------------------- TIME IN / OUT ----------------------------- */

export async function timeIn(rawCode) {
  const employee = await activeEmployee(rawCode);
  const now = new Date();
  const today = todayYmd(now);

  const existing = await AttendanceLog.findOne({
    where: { employee_id: employee.id, log_date: today },
  });
  if (existing && existing.time_in) {
    throw fail(409, "You already timed in today.");
  }

  const late = lateMinutes(now, today, SHIFT_START);
  const values = {
    time_in: now,
    late_minutes: late,
    status: late > 0 ? "late" : "present",
    remarks: null,
  };

  try {
    // An end-of-day "absent" row may already exist; update it instead.
    const log = existing
      ? await existing.update(values)
      : await AttendanceLog.create({
          employee_id: employee.id,
          log_date: today,
          ...values,
        });
    return { log, employee };
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      throw fail(409, "You already timed in today.");
    }
    throw err;
  }
}

export async function timeOut(rawCode) {
  const employee = await activeEmployee(rawCode);
  const now = new Date();
  const today = todayYmd(now);

  const log = await AttendanceLog.findOne({
    where: { employee_id: employee.id, log_date: today },
  });
  if (!log || !log.time_in) throw fail(404, "No time-in record found for today.");
  if (log.time_out) throw fail(409, "You already timed out today.");

  await log.update({
    time_out: now,
    hours_worked: hoursWorked(log.time_in, now, LUNCH_HOURS, MAX_REGULAR_HOURS),
    undertime_minutes: undertimeMinutes(now, today, SHIFT_END),
  });
  return { log, employee };
}

/* -------------------------------- REPORTS -------------------------------- */

// Logs with employee names. All filters optional (employee_code, not id).
export async function getLogs({ employee_code, date_from, date_to, status } = {}) {
  const where = [];
  const replacements = {};
  if (employee_code) {
    where.push("e.employee_code = :employee_code");
    replacements.employee_code = clean(employee_code);
  }
  if (date_from) {
    where.push("a.log_date >= :date_from");
    replacements.date_from = date_from;
  }
  if (date_to) {
    where.push("a.log_date <= :date_to");
    replacements.date_to = date_to;
  }
  if (status) {
    where.push("a.status = :status");
    replacements.status = status;
  }

  return sequelize.query(
    `SELECT a.log_code, e.employee_code, e.first_name, e.last_name,
            a.log_date, a.time_in, a.time_out, a.hours_worked,
            a.late_minutes, a.undertime_minutes, a.status, a.remarks
       FROM attendance_logs a
       JOIN employees e ON e.id = a.employee_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY a.log_date DESC, e.employee_code ASC`,
    { replacements, type: QueryTypes.SELECT }
  );
}

// Per-employee totals for payroll.
export async function getSummary({ date_from, date_to } = {}) {
  if (!date_from || !date_to) {
    throw fail(400, "date_from and date_to are required.");
  }
  const rows = await sequelize.query(
    `SELECT e.employee_code,
            SUM(a.status IN ('present','late')) AS days_present,
            SUM(a.status = 'late')              AS days_late,
            SUM(a.status = 'absent')            AS days_absent,
            SUM(a.status = 'on_leave')          AS days_on_leave,
            COALESCE(SUM(a.hours_worked), 0)       AS hours_worked,
            COALESCE(SUM(a.late_minutes), 0)       AS late_minutes,
            COALESCE(SUM(a.undertime_minutes), 0)  AS undertime_minutes
       FROM attendance_logs a
       JOIN employees e ON e.id = a.employee_id
      WHERE a.log_date BETWEEN :date_from AND :date_to
      GROUP BY e.employee_code
      ORDER BY e.employee_code`,
    { replacements: { date_from, date_to }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => ({
    employee_code: r.employee_code,
    days_present: Number(r.days_present),
    days_late: Number(r.days_late),
    days_absent: Number(r.days_absent),
    days_on_leave: Number(r.days_on_leave),
    hours_worked: Number(r.hours_worked),
    late_minutes: Number(r.late_minutes),
    undertime_minutes: Number(r.undertime_minutes),
  }));
}

// Counts for the dashboard cards.
export async function getDayStats(ymd = todayYmd()) {
  const rows = await sequelize.query(
    `SELECT status, COUNT(*) AS total
       FROM attendance_logs WHERE log_date = :d GROUP BY status`,
    { replacements: { d: ymd }, type: QueryTypes.SELECT }
  );
  const stats = { present: 0, late: 0, absent: 0, on_leave: 0 };
  for (const r of rows) stats[r.status] = Number(r.total);
  return { date: ymd, ...stats };
}

/* ------------------------------ END OF DAY ------------------------------ */

// Active employee with no log: approved leave -> on_leave, else absent.
// Skips non-work days and holidays.
export async function runEndOfDay(ymd = todayYmd()) {
  if (!WORK_DAYS.includes(dayOfWeek(ymd))) {
    return { date: ymd, skipped: true, reason: "Not a work day", absent: 0, on_leave: 0 };
  }
  const holiday = await isHoliday(ymd);
  if (holiday) {
    return { date: ymd, skipped: true, reason: `Holiday: ${holiday.name}`, absent: 0, on_leave: 0 };
  }

  const missing = await employeesWithoutLog(ymd);
  let absent = 0;
  let onLeave = 0;

  for (const m of missing) {
    const leave = Number(m.has_leave) === 1;
    try {
      await AttendanceLog.create({
        employee_id: m.id,
        log_date: ymd,
        status: leave ? "on_leave" : "absent",
        remarks: leave ? "Approved leave" : "No time-in recorded",
      });
      leave ? onLeave++ : absent++;
    } catch (err) {
      // Someone timed in while this was running: skip them.
      if (err.name !== "SequelizeUniqueConstraintError") throw err;
    }
  }
  return { date: ymd, skipped: false, reason: null, absent, on_leave: onLeave };
}

/* ------------------------------ CORRECTIONS ------------------------------ */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function getLogByCode(logCode) {
  const rows = await sequelize.query(
    `SELECT a.log_code, e.employee_code, e.first_name, e.last_name,
            a.log_date, a.time_in, a.time_out, a.status, a.remarks
       FROM attendance_logs a
       JOIN employees e ON e.id = a.employee_id
      WHERE a.log_code = :code
      LIMIT 1`,
    { replacements: { code: logCode }, type: QueryTypes.SELECT }
  );
  return rows[0] || null;
}

// HR fixes a log (forgot to tap, wrong time). A reason is required and the
// HR employee is saved in corrected_by_id.
export async function correctLog(logCode, { time_in, time_out, remarks } = {}, correctedById) {
  time_in = String(time_in || "").trim();
  time_out = String(time_out || "").trim();
  remarks = String(remarks || "").trim();

  if (!remarks) throw fail(400, "Please give a reason for the correction.");
  if (!time_in && !time_out) throw fail(400, "Enter a time in or a time out.");
  if ((time_in && !HHMM.test(time_in)) || (time_out && !HHMM.test(time_out))) {
    throw fail(400, "Use the HH:MM time format.");
  }

  const log = await AttendanceLog.findOne({ where: { log_code: logCode } });
  if (!log) throw fail(404, "Attendance log not found.");

  const ymd = String(log.log_date).slice(0, 10);
  const tin = time_in ? shiftBoundary(ymd, time_in) : log.time_in;
  const tout = time_out ? shiftBoundary(ymd, time_out) : log.time_out;

  if (!tin) throw fail(400, "A time in is needed before a time out.");
  if (tout && tout < tin) throw fail(400, "Time out cannot be earlier than time in.");

  const late = lateMinutes(tin, ymd, SHIFT_START);
  await log.update({
    time_in: tin,
    time_out: tout,
    late_minutes: late,
    status: late > 0 ? "late" : "present",
    hours_worked: tout ? hoursWorked(tin, tout, LUNCH_HOURS, MAX_REGULAR_HOURS) : 0,
    undertime_minutes: tout ? undertimeMinutes(tout, ymd, SHIFT_END) : 0,
    remarks: remarks.slice(0, 255),
    corrected_by_id: correctedById || null,
  });
  return log;
}
