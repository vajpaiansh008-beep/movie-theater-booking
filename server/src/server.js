import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import dns, { setServers } from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import { startBookingCleanupJob } from "../src/job/bookingCleanup.job.js"

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB before accepting requests
    await connectDB();

    // Start the HTTP server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      startBookingCleanupJob();
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
