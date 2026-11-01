// shared/services/authService.js  (owner: Fate, HR)
// Staff login for every staff module: users joined to employees (blueprint Section 6).
import bcrypt from "bcrypt";
import { User, Employee } from "../models/index.js";
import { AppError } from "../utils/appError.js";

export async function login(username, password) {
  const user = await User.findOne({ where: { username }, include: Employee });
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new AppError("INVALID_LOGIN", "Wrong username or password.");
  if (user.status !== "active" || user.Employee.status !== "active")
    throw new AppError("ACCOUNT_DISABLED", "This account is disabled.");
  await user.update({ last_login_at: new Date() });
  const e = user.Employee;
  return { user_id: user.id, employee_id: e.id, employee_code: e.employee_code,
           role: user.role, full_name: `${e.first_name} ${e.last_name}` };
}
