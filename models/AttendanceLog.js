// shared/models/AttendanceLog.js  (owner: Brian, Attendance)
// One row per employee per day. Matches shared/database/schema.sql exactly.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const ATTENDANCE_STATUSES = ["present", "late", "absent", "on_leave"];

export const AttendanceLog = sequelize.define(
  "AttendanceLog",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    log_code: { type: DataTypes.STRING(20), unique: true },
    employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    log_date: { type: DataTypes.DATEONLY, allowNull: false },
    time_in: DataTypes.DATE,
    time_out: DataTypes.DATE,
    hours_worked: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    late_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    undertime_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [ATTENDANCE_STATUSES] },
    },
    remarks: DataTypes.STRING(255),
    corrected_by_id: DataTypes.INTEGER.UNSIGNED,
  },
  { tableName: "attendance_logs" }
);

addCodeHook(AttendanceLog, "log_code", "ATT");