import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
dotenv.config();

import DBConnection from "./config/database";
import router from "./routes";
import { setupSwagger } from "../app/config/swagger";
import { seedAdmin } from "./seeder/adminSeed";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const app = express();

// Swagger runs in development, or in production when ENABLE_SWAGGER=true
const swaggerEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_SWAGGER === "true";

// Security headers. CSP is relaxed when Swagger is enabled so Swagger UI can load.
app.use(
  helmet({
    contentSecurityPolicy: swaggerEnabled ? false : undefined,
  }),
);

// CORS - set CLIENT_URL (comma separated for multiple origins) to restrict.
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : "*";
app.use(cors({ origin: allowedOrigins }));

app.use(express.json());

DBConnection();

seedAdmin();

if (swaggerEnabled) {
  setupSwagger(app);
}

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "HRMS API is running" });
});

app.use("/v1/api/", router);

export default app;
