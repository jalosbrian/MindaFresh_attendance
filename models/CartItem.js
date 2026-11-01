// shared/models/CartItem.js  (owner: Ali, Shop) — table: cart_items
// Keeps product_id + quantity only. Prices are read live from products at checkout.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const CartItem = sequelize.define("CartItem", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  customer_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: "cart_items" });
