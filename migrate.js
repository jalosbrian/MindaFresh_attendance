// `xian migrate` used to run sequelize.sync({ force: true }), which would DELETE every table
// in the shared database. MindaFresh ERP forbids sync (blueprint Section 3), so this only explains what to do.
console.log(`
  MindaFresh ERP does not use xian migrate.

  The tables come only from shared/database/schema.sql, then the test data from seed.sql.
  In phpMyAdmin: Import → schema.sql, then Import → seed.sql.

  To check the connection from this module, run:  xian start
`);
process.exit(0);
