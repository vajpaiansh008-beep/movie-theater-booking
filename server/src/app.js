import express from "express";
import path from "path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

//API Routes from src/routes

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import movieRoutes from "./routes/movie.routes.js";
import adminTheaterRoutes from "./routes/adminTheater.routes.js";
import adminScreenRoutes from "./routes/adminScreen.routes.js";
import adminSeatRoutes from "./routes/adminSeat.routes.js";
import adminShowRoutes from "./routes/adminShow.routes.js";

import publicShowRoutes from "./routes/publicShow.routes.js";

import seatLockRoutes from "./routes/seatLock.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If this file is server/src/app.js:
const uploadsPath = path.resolve(__dirname, "../uploads");

app.use("/uploads", express.static(uploadsPath));

// Parse incoming JSON requests
app.use(express.json({ limit: "10kb" }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Parse cookies
app.use(cookieParser());

// HTTP request logging during development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// Health-check endpoint
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Movie Theater Booking API is running",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);

// Movies Routes
app.use("/api/v1/movies", movieRoutes);

// Admin Routes
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin/theaters", adminTheaterRoutes);
app.use("/api/v1/admin/screens", adminScreenRoutes);
app.use("/api/v1/admin/seats", adminSeatRoutes);
app.use("/api/v1/admin/shows", adminShowRoutes);

// Public routes
app.use("/api/v1/shows", publicShowRoutes);

// Seat Lock
app.use("/api/v1/seat-locks", seatLockRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/payments", paymentRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Movie Theater Booking API",
  });
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

export default app;
