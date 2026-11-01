// shared/models/Department.js  (owner: Fate, HR) — table: departments
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const Department = sequelize.define("Department", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  department_code: { type: DataTypes.STRING(20), unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false }
}, { tableName: "departments" });

addCodeHook(Department, "department_code", "DEP");
