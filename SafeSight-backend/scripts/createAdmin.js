// Creates (or promotes) an admin account. Usage: npm run create-admin
// Reads ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME from .env
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import "../config/env.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Administrator" } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in .env first.");
  process.exit(1);
}

await connectDB();
const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
if (existing) {
  existing.role = "admin";
  await existing.save();
  console.log(`Promoted ${ADMIN_EMAIL} to admin.`);
} else {
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: "admin",
  });
  console.log(`Created admin ${ADMIN_EMAIL}.`);
}
await mongoose.disconnect();
