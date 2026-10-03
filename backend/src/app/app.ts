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

// Security headers. CSP is relaxed outside production so Swagger UI can load.
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
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

// Swagger (dev only)
if (process.env.NODE_ENV !== "production") {
  setupSwagger(app);
}

app.use("/v1/api/", router);
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "HRMS API is running" });
});
export default app;
