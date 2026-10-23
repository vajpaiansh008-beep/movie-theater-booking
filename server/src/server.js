
import dns from "node:dns";
import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { startBookingCleanupJob } from "./job/bookingCleanup.job.js";

// Work around the Windows Node.js DNS SRV resolution issue.
// Keep the default DNS configuration on Render/Linux.
if (process.platform === "win32") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(
        `Environment: ${process.env.NODE_ENV || "development"}`
      );

      startBookingCleanupJob();
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
