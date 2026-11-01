// shared/models/Employee.js  (owner: Fate, HR) — table: employees
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const Employee = sequelize.define("Employee", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  employee_code: { type: DataTypes.STRING(20), unique: true },
  first_name: { type: DataTypes.STRING(50), allowNull: false },
  middle_name: DataTypes.STRING(50),
  last_name: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false },
  phone: DataTypes.STRING(20),
  address: DataTypes.STRING(255),
  birth_date: DataTypes.DATEONLY,
  hire_date: { type: DataTypes.DATEONLY, allowNull: false },
  department_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  position: { type: DataTypes.STRING(100), allowNull: false },
  employment_type: { type: DataTypes.STRING(20), allowNull: false },
  daily_rate: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  vacation_leave_balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  sick_leave_balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active" }
}, { tableName: "employees" });

addCodeHook(Employee, "employee_code", "EMP");
