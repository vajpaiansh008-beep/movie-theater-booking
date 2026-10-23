import { cleanupExpiredBookings } from "../services/bookingCleanup.service.js";

const CLEANUP_INTERVAL_MS = 60 * 1000;

let isRunning = false;
let intervalId = null;

async function runBookingCleanup() {
  // Prevent overlapping cleanup executions.
  if (isRunning) return;

  isRunning = true;

  try {
    await cleanupExpiredBookings();
  } catch (error) {
    console.error(
      "[Booking Cleanup] Failed:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    isRunning = false;
  }
}

export function startBookingCleanupJob() {
  // Prevent accidentally starting multiple intervals.
  if (intervalId) {
    return intervalId;
  }

  console.log(
    `[Booking Cleanup] Scheduler started (every ${CLEANUP_INTERVAL_MS / 1000}s)`,
  );

  intervalId = setInterval(() => {
    void runBookingCleanup();
  }, CLEANUP_INTERVAL_MS);

  return intervalId;
}
