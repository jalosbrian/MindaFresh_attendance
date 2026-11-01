// shared/models/StockMovement.js  (owner: Bren, POS) — table: stock_movements
// Every change to stock, no exceptions. Links to its source with sale_id, order_id or purchase_order_id.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const StockMovement = sequelize.define("StockMovement", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  movement_code: { type: DataTypes.STRING(20), unique: true },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  movement_type: { type: DataTypes.STRING(20), allowNull: false },
  quantity_change: { type: DataTypes.INTEGER, allowNull: false },
  quantity_before: { type: DataTypes.INTEGER, allowNull: false },
  quantity_after: { type: DataTypes.INTEGER, allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  sale_id: DataTypes.INTEGER.UNSIGNED,
  order_id: DataTypes.INTEGER.UNSIGNED,
  purchase_order_id: DataTypes.INTEGER.UNSIGNED,
  remarks: DataTypes.STRING(255),
  employee_id: DataTypes.INTEGER.UNSIGNED
}, { tableName: "stock_movements" });

addCodeHook(StockMovement, "movement_code", "STK");
