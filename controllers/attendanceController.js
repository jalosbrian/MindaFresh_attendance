// controllers/attendanceController.js  (Attendance module, Brian)
import * as svc from "../services/attendanceService.js";
import { timeLabel, todayYmd, hhmm } from "../utils/attendanceTime.js";

const STATUS_LABEL = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "On leave",
};

// DATE columns may arrive as a string or a Date; always show YYYY-MM-DD (Manila).
const ymd = (d) =>
  typeof d === "string"
    ? d.slice(0, 10)
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);

const row = (r) => ({
  log_code: r.log_code,
  employee_code: r.employee_code,
  full_name: `${r.first_name} ${r.last_name}`,
  log_date: ymd(r.log_date),
  time_in: timeLabel(r.time_in),
  time_out: timeLabel(r.time_out),
  hours_worked: Number(r.hours_worked).toFixed(2),
  late_minutes: r.late_minutes,
  undertime_minutes: r.undertime_minutes,
  status: r.status,
  status_label: STATUS_LABEL[r.status] || r.status,
  remarks: r.remarks || "",
});

const statusOptions = (selected) =>
  Object.entries(STATUS_LABEL).map(([value, label]) => ({
    value,
    label,
    selected: value === selected,
  }));

// Known errors (err.status) show their message; anything else is logged.
function flashError(req, err) {
  if (err.status) req.flash("error_msg", err.message);
  else {
    console.error(err);
    req.flash("error_msg", "Something went wrong. Please try again.");
  }
}

/* -------------------------------- KIOSK -------------------------------- */

export const kioskPage = (req, res) =>
  res.render("kiosk", { title: "Time In / Out", today: todayYmd() });

export const kioskTimeIn = async (req, res) => {
  try {
    const { log, employee } = await svc.timeIn(req.body.employee_code);
    let msg = `${employee.first_name}, your time in was recorded at ${timeLabel(log.time_in)}.`;
    if (log.late_minutes > 0) msg += ` You are ${log.late_minutes} minute(s) late.`;
    req.flash("success_msg", msg);
  } catch (err) {
    flashError(req, err);
  }
  res.redirect("/kiosk");
};

export const kioskTimeOut = async (req, res) => {
  try {
    const { log, employee } = await svc.timeOut(req.body.employee_code);
    req.flash(
      "success_msg",
      `${employee.first_name}, your time out was recorded at ${timeLabel(log.time_out)}. Hours worked: ${Number(log.hours_worked).toFixed(2)}.`
    );
  } catch (err) {
    flashError(req, err);
  }
  res.redirect("/kiosk");
};

/* ------------------------------ STAFF PAGES ------------------------------ */

export const dashboardPage = async (req, res) => {
  try {
    const today = todayYmd();
    const stats = await svc.getDayStats(today);
    const logs = (await svc.getLogs({ date_from: today, date_to: today })).map(row);
    res.render("dashboard", { title: "Dashboard", today, stats, logs });
  } catch (err) {
    flashError(req, err);
    res.redirect("/login");
  }
};

export const logsPage = async (req, res) => {
  const { employee_code = "", date_from = "", date_to = "", status = "" } = req.query;
  let logs = [];
  try {
    logs = (
      await svc.getLogs({
        employee_code: employee_code || undefined,
        date_from: date_from || undefined,
        date_to: date_to || undefined,
        status: status || undefined,
      })
    ).map(row);
  } catch (err) {
    flashError(req, err);
  }
  res.render("logs", {
    title: "Attendance logs",
    logs,
    filters: { employee_code, date_from, date_to },
    statuses: statusOptions(status),
  });
};

export const summaryPage = async (req, res) => {
  const today = todayYmd();
  const date_from = req.query.date_from || `${today.slice(0, 8)}01`;
  const date_to = req.query.date_to || today;
  let rows = [];
  try {
    rows = await svc.getSummary({ date_from, date_to });
  } catch (err) {
    flashError(req, err);
  }
  res.render("summary", { title: "Summary", rows, date_from, date_to });
};

export const runEndOfDay = async (req, res) => {
  try {
    const r = await svc.runEndOfDay(req.body.date || todayYmd());
    req.flash(
      "success_msg",
      r.skipped
        ? `End-of-day skipped for ${r.date} (${r.reason}).`
        : `End-of-day done for ${r.date}: ${r.absent} absent, ${r.on_leave} on leave.`
    );
  } catch (err) {
    flashError(req, err);
  }
  res.redirect("/dashboard");
};

// Any logged-in staff can see their own logs.
export const myLogsPage = async (req, res) => {
  const me = req.session.user;
  const { date_from = "", date_to = "" } = req.query;
  let logs = [];
  try {
    logs = (
      await svc.getLogs({
        employee_code: me.employee_code,
        date_from: date_from || undefined,
        date_to: date_to || undefined,
      })
    ).map(row);
  } catch (err) {
    flashError(req, err);
  }
  res.render("my-logs", { title: "My attendance", logs, filters: { date_from, date_to } });
};

/* ------------------------- HR: CORRECT A LOG ------------------------- */

export const logEditPage = async (req, res) => {
  try {
    const log = await svc.getLogByCode(req.params.log_code);
    if (!log) {
      req.flash("error_msg", "Attendance log not found.");
      return res.redirect("/logs");
    }
    res.render("log-edit", {
      title: "Correct log",
      log: {
        log_code: log.log_code,
        employee_code: log.employee_code,
        full_name: `${log.first_name} ${log.last_name}`,
        log_date: ymd(log.log_date),
        status: log.status,
        status_label: STATUS_LABEL[log.status] || log.status,
        time_in: hhmm(log.time_in),
        time_out: hhmm(log.time_out),
        remarks: log.remarks || "",
      },
    });
  } catch (err) {
    flashError(req, err);
    res.redirect("/logs");
  }
};

export const logEditSave = async (req, res) => {
  const code = req.params.log_code;
  try {
    await svc.correctLog(code, req.body, req.session.user.employee_id);
    req.flash("success_msg", `Log ${code} was corrected.`);
    res.redirect("/logs");
  } catch (err) {
    flashError(req, err);
    res.redirect(`/logs/${encodeURIComponent(code)}/edit`);
  }
};
