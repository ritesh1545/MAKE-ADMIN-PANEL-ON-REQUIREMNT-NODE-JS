require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env"
      );
    }

    if (password.length < 12) {
      throw new Error("Use an admin password of at least 12 characters.");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.name = name;
      existingUser.role = "admin";
      existingUser.password = await bcrypt.hash(password, 12);

      await existingUser.save();

      console.log("Existing account updated as administrator.");
    } else {
      await User.create({
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role: "admin"
      });

      console.log("Administrator account created successfully.");
    }
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();