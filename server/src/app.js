import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

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
