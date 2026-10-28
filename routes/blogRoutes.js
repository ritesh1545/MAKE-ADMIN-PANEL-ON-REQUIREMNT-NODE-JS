const express = require("express");
const Post = require("../models/Post");
const { isLoggedIn } = require("../middleware/auth");

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "name");

    res.render("dashboard", { posts });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not load blog posts."
    });
  }
});


router.post("/posts", isLoggedIn, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).send("Title and content are required.");
    }

    await Post.create({
      title: title.trim(),
      content: content.trim(),
      author: req.session.userId
    });

    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Could not create the blog post."
    });
  }
});

module.exports = router;