import { cleanupExpiredBookings } from "../services/bookingCleanup.service.js";

let isRunning = false;

export function startBookingCleanupJob() {
  console.log("Booking cleanup scheduler started");

  const interval = setInterval(async () => {
    if (isRunning) return;

    console.log("Booking cleanup check running:", new Date().toLocaleString());

    isRunning = true;

    try {
      const result = await cleanupExpiredBookings();

      console.log("Booking cleanup result:", result);
    } catch (error) {
      console.error("Booking cleanup error:", error.message);
    } finally {
      isRunning = false;
    }
  }, 60 * 1000);

  return interval;
}
