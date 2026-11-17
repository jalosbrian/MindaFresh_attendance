# MindaFresh Attendance Module — initial working scaffold

Built from the uploaded Attendance Blueprint and ERP v2.4. This is a **standalone Express/Xian-compatible source scaffold**, not a verified XianFire CLI-generated project. For strict XianFire compliance, merge these routes/services/views into your `xianfires new attendance` generated CRUD project.

## Run
1. Import the **group's** shared `schema.sql` into Laragon MySQL 8.4. Do not create a separate database or use `sequelize.sync()`.
2. Verify `attendance_logs` has `lunch_out` and `lunch_in` columns (provided schema already has them).
3. Copy `.env.example` to `.env`; set DB credentials and a strong SESSION_SECRET.
4. Run `npm install`, then `npm run dev` in this folder.
5. Open `http://localhost:3003/kiosk` (public) or `/login` (HR/admin users from shared `users` table).

## Features
- Public four-step employee-code kiosk, holiday/rest-day validation, 1-minute repeat guard.
- HR login, today board, logs, manual correction, holiday management, close days, summary, printable DTR.
- Shared DB read of employees, users, departments, approved leave requests.

## Important before deployment
- This scaffold has not been executed against your Laragon database or verified against your existing XianFire generated app.
- Add CSRF protection, request validation, login rate limiting, persistent session store, audit history, robust timezone/date handling and integration tests before production.
- Correction form currently requires re-entering all times; it does not prefill existing punches. Implement prefill before HR uses it on real records.
- DTR is an initial printable table, not yet the finalized one-employee cutoff calendar with complete totals.
- `getSummary(from,to)` is a starting implementation; compare its exact field names and business totals with HR's shared service contract before integrating payroll.
- Use the group's shared `schema.sql` as the only schema source. Do not import it again into a populated database.


## Blueprint v2.4 patch (Nov 10)
- Kiosk: client-side confirmation dialog before actual POST; server validates the punch.
- Logs: date/employee/status filters, View/Edit modal, correction remarks required.
- Holidays: edit + delete confirmation.
- Period summary: HR contract fields `days_present`, `days_late`, `days_absent`, `days_on_leave`, `late_minutes`, `undertime_minutes`, `hours_worked`.
- Close days: `/summary/close-days` and ATT codes for generated absent/on-leave records.
- No schema migrations, database resets or `sequelize.sync()`.
- Run integration tests against a disposable copy of the database before using on live records.
- Known limitations: project still needs group shared-service integration, full DTR cutoff workflow and automated end-to-end tests.
