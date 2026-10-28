require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const methodOverride = require("method-override");
const path = require("path");

const connectDB = require("./config/db");
const User = require("./models/User");

const authRoutes = require("./routes/authRoutes");
const blogRoutes = require("./routes/blogRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  name: "blog.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions"
  }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60
  }
}));

app.use(async (req, res, next) => {
  try {
    res.locals.currentUserId = null;
    res.locals.currentUserRole = null;

    if (req.session.userId) {
      const user = await User.findById(req.session.userId)
        .select("role");

      if (!user) {
        return req.session.destroy((err) => {
          if (err) return next(err);
          next();
        });
      }


      req.session.role = user.role;
      res.locals.currentUserId = user._id.toString();
      res.locals.currentUserRole = user.role;
    }

    next();
  } catch (error) {
    next(error);
  }
});

app.get("/health", (req, res) => {
  res.send("Blog Admin Panel is running.");
});

app.use("/", authRoutes);
app.use("/", blogRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).render("error", {
    message: "Page not found."
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) return next(err);

  res.status(500).render("error", {
    message: "An unexpected server error occurred."
  });
});

async function startServer() {
  if (!process.env.SESSION_SECRET || !process.env.MONGO_URI) {
    throw new Error("Set SESSION_SECRET and MONGO_URI in .env");
  }

  await connectDB();

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});