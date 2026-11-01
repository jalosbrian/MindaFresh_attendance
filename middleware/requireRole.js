// shared/middleware/requireRole.js  (owner: Fate, HR)
// Page guard by role: router.get("/admin/orders", requireRole("admin", "accountant"), ...)
// Each module sets STAFF_LOGIN_PATH in .env if its staff login is not at /login (the Shop uses /admin/login).
export const requireRole = (...roles) => (req, res, next) => {
  const loginPath = process.env.STAFF_LOGIN_PATH || "/login";
  const user = req.session?.user;
  if (!user) return res.redirect(loginPath);
  if (!roles.includes(user.role)) {
    req.flash("error_msg", "Your account cannot open that page.");
    return res.redirect(loginPath);
  }
  next();
};
