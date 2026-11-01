// routes/index.js  (Attendance module, Brian)
import express from "express";
import { requireRole } from "../middleware/requireRole.js";
import {
  kioskPage, kioskTimeIn, kioskTimeOut,
  dashboardPage, logsPage, summaryPage, runEndOfDay, myLogsPage,
  logEditPage, logEditSave,
} from "../controllers/attendanceController.js";
import { loginPage, loginUser, logoutUser } from "../controllers/authController.js";

const router = express.Router();

// Values every page needs (nav, app name).
router.use((req, res, next) => {
  const user = req.session?.user || null;
  res.locals.user = user;
  res.locals.isStaff = !!user && ["admin", "hr_staff"].includes(user.role);
  res.locals.appName = process.env.APP_NAME || "MindaFresh Attendance";
  // Highlights the sidebar item: /my-logs -> nav.mylogs, /kiosk -> nav.kiosk ...
  const seg = (req.path.split("/")[1] || "kiosk").replace("-", "");
  res.locals.nav = { [seg]: true };
  next();
});

const HR = requireRole("admin", "hr_staff");
const ANY_STAFF = requireRole(
  "admin", "cashier", "inventory_staff", "hr_staff", "accountant", "employee"
);

// Kiosk: open to everyone on the LAN (employee_code only).
router.get("/", (req, res) => res.redirect("/kiosk"));
router.get("/kiosk", kioskPage);
router.post("/kiosk/time-in", kioskTimeIn);
router.post("/kiosk/time-out", kioskTimeOut);

// Staff login
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/logout", logoutUser);

// HR / admin
router.get("/dashboard", HR, dashboardPage);
router.get("/logs", HR, logsPage);
router.get("/logs/:log_code/edit", HR, logEditPage);
router.post("/logs/:log_code/edit", HR, logEditSave);
router.get("/summary", HR, summaryPage);
router.post("/end-of-day", HR, runEndOfDay);

// Everyone logged in
router.get("/my-logs", ANY_STAFF, myLogsPage);

export default router;
