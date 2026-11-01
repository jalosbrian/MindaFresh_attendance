// shared/models/PayrollRun.js  (owner: Fate, HR) — table: payroll_runs
// "Paid" is not a status here: a run is paid when its salary_releases row is released.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

const money = { type: DataTypes.DECIMAL(12, 2), allowNull: false };

export const PayrollRun = sequelize.define("PayrollRun", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  payroll_code: { type: DataTypes.STRING(20), unique: true },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  employee_count: { type: DataTypes.INTEGER, allowNull: false },
  total_gross: money,
  total_contributions: money,
  total_withholding_tax: money,
  total_net: money,
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "draft" },
  prepared_by_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  approved_by_id: DataTypes.INTEGER.UNSIGNED,
  approved_at: DataTypes.DATE
}, { tableName: "payroll_runs" });

addCodeHook(PayrollRun, "payroll_code", "PAY");
