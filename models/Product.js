// shared/models/Product.js  (owner: Bren, POS) — table: products
// cost_price is the weighted average cost. It is never shown in the Shop.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const Product = sequelize.define("Product", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_code: { type: DataTypes.STRING(20), unique: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: DataTypes.TEXT,
  category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  unit: { type: DataTypes.STRING(10), allowNull: false },
  cost_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  selling_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  reorder_level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  is_online: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  image_url: DataTypes.STRING(255),
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active" }
}, { tableName: "products" });

addCodeHook(Product, "product_code", "PRD");
