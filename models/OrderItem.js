// shared/models/OrderItem.js  (owner: Ali, Shop) — table: order_items
// product_name, unit_price and unit_cost are snapshots: history only, never edited.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const OrderItem = sequelize.define("OrderItem", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  product_name: { type: DataTypes.STRING(150), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  line_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
}, { tableName: "order_items" });
