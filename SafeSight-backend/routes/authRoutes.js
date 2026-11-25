import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

// Signup — public signup can only create citizen or family accounts.
// Admins are created with `npm run create-admin`.
router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name?.trim() || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (await User.exists({ email: email.toLowerCase() })) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const user = await User.create({
    name: name.trim(),
    email,
    password: await bcrypt.hash(password, 10),
    role: role === "family" ? "family" : "citizen",
  });

  res.status(201).json({ token: signToken(user), user: user.toPublic() });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  // Same message for both cases so attackers can't discover which emails exist
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // The password hash is NOT sent back any more
  res.json({ token: signToken(user), user: user.toPublic() });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export default router;
