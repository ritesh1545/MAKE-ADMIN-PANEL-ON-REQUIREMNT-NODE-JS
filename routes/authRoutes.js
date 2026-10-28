const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

router.get("/register", (req, res) => {
  res.render("register", { error: null });
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).render("register", {
        error: "All fields are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).render("register", {
        error: "Password must be at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).render("register", {
        error: "Email is already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user"
    });

    req.session.userId = user._id.toString();
    req.session.role = user.role;

    res.redirect("/");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).render("register", {
        error: "Email is already registered."
      });
    }

    console.error(error);

    res.status(500).render("error", {
      message: "Could not create your account."
    });
  }
});

router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Enter your email and password."
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("login", {
        error: "Invalid email or password."
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).render("error", {
          message: "Could not start your session."
        });
      }

      req.session.userId = user._id.toString();
      req.session.role = user.role;

      req.session.save((saveErr) => {
        if (saveErr) {
          return res.status(500).render("error", {
            message: "Could not save your session."
          });
        }

        if (user.role === "admin") {
          return res.redirect("/admin/dashboard");
        }

        res.redirect("/");
      });
    });
  } catch (error) {
    console.error(error);

    res.status(500).render("error", {
      message: "Login failed. Please try again."
    });
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    res.clearCookie("blog.sid");
    res.redirect("/login");
  });
});

module.exports = router;