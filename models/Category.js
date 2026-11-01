// shared/models/Category.js  (owner: Bren, POS) — table: categories
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const Category = sequelize.define("Category", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  category_code: { type: DataTypes.STRING(20), unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false }
}, { tableName: "categories" });

addCodeHook(Category, "category_code", "CAT");
