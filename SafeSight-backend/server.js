import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import foundRoutes from "./routes/foundRoutes.js";
import missingRoutes from "./routes/missingRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

const app = express();

// Requests normally arrive through the Next.js site on the same computer;
// trust its X-Forwarded-For header so rate limits apply per real visitor.
app.set("trust proxy", "loopback");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.corsOrigins }));

// Slow down password guessing and sign-up spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait 15 minutes and try again." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/missing", missingRoutes);
app.use("/api/found", foundRoutes);
app.use("/api/stats", statsRoutes);

app.get("/", (_req, res) => res.send("SafeSight backend running"));

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

// Central error handler (Express 5 forwards rejected async handlers here)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") err.status = 400;
  if (err.name === "ValidationError" || err.name === "CastError") err.status = 400;
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && !err.status ? "Something went wrong on the server" : err.message,
  });
});

await connectDB();
app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
