// controllers/authController.js  (Attendance module, Brian)
// Staff login goes through the shared authService (users + employees).
import { login } from "../services/authService.js";

export const loginPage = (req, res) => {
  const user = req.session?.user;
  if (user) {
    const staff = ["admin", "hr_staff"].includes(user.role);
    return res.redirect(staff ? "/dashboard" : "/my-logs");
  }
  res.render("login", { title: "Staff login" });
};

export const loginUser = async (req, res) => {
  try {
    const user = await login(req.body.username, req.body.password);
    req.session.user = user;
    const staff = ["admin", "hr_staff"].includes(user.role);
    res.redirect(staff ? "/dashboard" : "/my-logs");
  } catch (err) {
    req.flash("error_msg", err.message || "Login failed.");
    res.redirect("/login");
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
};
