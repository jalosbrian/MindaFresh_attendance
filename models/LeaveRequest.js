// shared/models/LeaveRequest.js  (owner: Fate, HR) — table: leave_requests
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const LeaveRequest = sequelize.define("LeaveRequest", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  leave_code: { type: DataTypes.STRING(20), unique: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  leave_type: { type: DataTypes.STRING(20), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  days: { type: DataTypes.INTEGER, allowNull: false },
  reason: DataTypes.STRING(255),
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
  approved_by_id: DataTypes.INTEGER.UNSIGNED
}, { tableName: "leave_requests" });

addCodeHook(LeaveRequest, "leave_code", "LVE");
