// shared/models/StockLevel.js  (owner: Bren, POS) — table: stock_levels
// One row per product. Changed only by stockService.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const StockLevel = sequelize.define("StockLevel", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  quantity_on_hand: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: "stock_levels" });
