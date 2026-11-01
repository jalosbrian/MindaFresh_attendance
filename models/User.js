// shared/models/User.js  (owner: Fate, HR) — table: users (staff logins, one per employee)
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_code: { type: DataTypes.STRING(20), unique: true },
  employee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active" },
  last_login_at: DataTypes.DATE
}, { tableName: "users" });

addCodeHook(User, "user_code", "USR");
