const User = require("../models/User");

async function isLoggedIn(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.userId)
      .select("role");

    if (!user) {
      return req.session.destroy((err) => {
        if (err) return next(err);
        res.redirect("/login");
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function isAdmin(req, res, next) {
  isLoggedIn(req, res, (error) => {
    if (error) return next(error);

    if (res.headersSent) return;

    // isLoggedIn has already checked the database user.
    if (!req.currentUser || req.currentUser.role !== "admin") {
      return res.status(403).render("error", {
        message: "Access denied. Administrators only."
      });
    }

    next();
  });
}

module.exports = { isLoggedIn, isAdmin };