// Loads .env once and fails fast if a required secret is missing.
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const required = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length && process.env.NODE_ENV !== "test") {
  console.error(
    `Missing environment variables: ${missing.join(", ")}.\n` +
      "Copy .env.example to .env and fill in the values."
  );
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  aiServiceUrl: (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, ""),
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim()),
};
