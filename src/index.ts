import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import tasksRoutes from "./routes/tasks.routes";
import { errorHandler } from "./middleware/error.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
// set CLIENT_URL from env; in production it should be https://your-frontend.vercel.app
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

/**
 * IMPORTANT:
 * If behind a proxy (Railway), enable trust proxy so secure cookies are set.
 */
app.set("trust proxy", 1);

app.use(
  cors({
    origin: Array.isArray(process.env.CLIENT_URLS)
      ? process.env.CLIENT_URLS.split(",").map(s => s.trim())
      : [CLIENT_URL],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
