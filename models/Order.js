// shared/models/Order.js  (owner: Ali, Shop) — table: orders
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const Order = sequelize.define("Order", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  order_code: { type: DataTypes.STRING(20), unique: true },
  customer_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  shipping_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  payment_method: { type: DataTypes.STRING(20), allowNull: false },
  payment_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "unpaid" },
  order_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
  delivery_address: { type: DataTypes.STRING(255), allowNull: false },
  ordered_at: { type: DataTypes.DATE, allowNull: false },
  delivered_at: DataTypes.DATE
}, { tableName: "orders" });

addCodeHook(Order, "order_code", "ORD");
