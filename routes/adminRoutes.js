const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Post = require("../models/Post");
const { isAdmin } = require("../middleware/auth");

const router = express.Router();


router.use(isAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalAdmins,
      recentUsers,
      recentPosts
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email createdAt"),
      Post.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("author", "name email")
        .select("title author createdAt")
    ]);

    res.render("admin/dashboard", {
      totalUsers,
      totalPosts,
      totalAdmins,
      recentUsers,
      recentPosts
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not load dashboard statistics."
    });
  }
});


router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("name email role createdAt");

    res.render("admin/users", { users });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not load users."
    });
  }
});


router.post("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send("Invalid user ID.");
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).send("Invalid role.");
    }

    
    if (id === req.session.userId && role !== "admin") {
      return res.status(400).send("You cannot demote yourself.");
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).send("User not found.");
    }

    
    await mongoose.connection.collection("sessions").deleteMany({
      "session.userId": id
    });

    res.redirect("/admin/users");
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not update the user role."
    });
  }
});


router.post("/users/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send("Invalid user ID.");
    }

    if (id === req.session.userId) {
      return res.status(400).send("You cannot delete your own account here.");
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).send("User not found.");
    }


    await Post.deleteMany({ author: user._id });
    await User.deleteOne({ _id: user._id });
    await mongoose.connection.collection("sessions").deleteMany({
      "session.userId": id
    });

    res.redirect("/admin/users");
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not delete the user."
    });
  }
});


router.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "name email");

    res.render("admin/posts", { posts });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not load posts."
    });
  }
});


router.get("/posts/:id/edit", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).send("Post not found.");
    }

    res.render("admin/edit-post", { post });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not open the post editor."
    });
  }
});


router.post("/posts/:id/edit", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title?.trim() || !content?.trim()) {
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).send("Post not found.");
      }

      return res.status(400).render("admin/edit-post", {
        post,
        error: "Title and content are required."
      });
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title: title.trim(),
          content: content.trim()
        }
      },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).send("Post not found.");
    }

    res.redirect("/admin/posts");
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not update the post."
    });
  }
});


router.post("/posts/:id/delete", async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).send("Post not found.");
    }

    res.redirect("/admin/posts");
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not delete the post."
    });
  }
});

module.exports = router;