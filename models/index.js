// shared/models/index.js — all models and their associations.
// This file has the 10 models the Online Shop uses. Each owner adds the rest of the 26
// (departments, leave_requests, payroll, suppliers, purchase orders, sales, attendance, accounting).
import { sequelize } from "../config/database.js";
import { Employee } from "./Employee.js";
import { User } from "./User.js";
import { Category } from "./Category.js";
import { Product } from "./Product.js";
import { StockLevel } from "./StockLevel.js";
import { StockMovement } from "./StockMovement.js";
import { Customer } from "./Customer.js";
import { CartItem } from "./CartItem.js";
import { Order } from "./Order.js";
import { OrderItem } from "./OrderItem.js";
import { AttendanceLog } from "./AttendanceLog.js"; // <-- Attendance (Brian)

// HR
User.belongsTo(Employee, { foreignKey: "employee_id" });
Employee.hasOne(User, { foreignKey: "employee_id" });

// POS
Product.belongsTo(Category, { foreignKey: "category_id" });
Category.hasMany(Product, { foreignKey: "category_id" });
Product.hasOne(StockLevel, { foreignKey: "product_id" });
StockLevel.belongsTo(Product, { foreignKey: "product_id" });
StockMovement.belongsTo(Product, { foreignKey: "product_id" });
StockMovement.belongsTo(Employee, { foreignKey: "employee_id" });
StockMovement.belongsTo(Order, { foreignKey: "order_id" });

// Shop
CartItem.belongsTo(Customer, { foreignKey: "customer_id" });
CartItem.belongsTo(Product, { foreignKey: "product_id" });
Customer.hasMany(CartItem, { foreignKey: "customer_id" });
Order.belongsTo(Customer, { foreignKey: "customer_id" });
Customer.hasMany(Order, { foreignKey: "customer_id" });
Order.hasMany(OrderItem, { foreignKey: "order_id" });
OrderItem.belongsTo(Order, { foreignKey: "order_id" });
OrderItem.belongsTo(Product, { foreignKey: "product_id" });

// Attendance (Brian)
AttendanceLog.belongsTo(Employee, { foreignKey: "employee_id" });
Employee.hasMany(AttendanceLog, { foreignKey: "employee_id" });
AttendanceLog.belongsTo(Employee, { as: "correctedBy", foreignKey: "corrected_by_id" });

export {
  sequelize,
  Employee, User,
  Category, Product, StockLevel, StockMovement,
  Customer, CartItem, Order, OrderItem,
  AttendanceLog
};