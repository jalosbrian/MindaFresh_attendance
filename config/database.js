// shared/config/database.js  (owner: Fate, HR) — copied into every module by shared/sync.js
// Settings from blueprint Section 3. Never call sequelize.sync() anywhere.
import "dotenv/config";
import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",                       // also right for MariaDB (XAMPP)
    timezone: "+08:00",
    logging: false,
    dialectOptions: { decimalNumbers: true }, // DECIMAL comes back as a number
    define: {
      underscored: true,      // created_at, updated_at, employee_id
      freezeTableName: true,  // table name = exactly what we write
      timestamps: true
    }
  }
);
