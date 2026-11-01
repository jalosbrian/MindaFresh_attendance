// shared/models/Customer.js  (owner: Ali, Shop) — table: customers
// Shop accounts. Customers log in only to the Shop, with this table.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { addCodeHook } from "./codeHook.js";

export const Customer = sequelize.define("Customer", {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  customer_code: { type: DataTypes.STRING(20), unique: true },
  first_name: { type: DataTypes.STRING(50), allowNull: false },
  last_name: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  phone: DataTypes.STRING(20),
  address: DataTypes.STRING(255),
  city: DataTypes.STRING(100),
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active" }
}, { tableName: "customers" });

addCodeHook(Customer, "customer_code", "CUS");
