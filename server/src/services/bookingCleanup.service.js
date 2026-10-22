import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import ShowSeat from "../models/showSeat.model.js";
import razorpay from "../config/razorpay.js";

export async function cleanupExpiredBookings() {
  const now = new Date();

  const pendingBookings = await Booking.find({
    status: "pending",
    paymentStatus: "pending",
    reservationExpiresAt: { $lte: now },
    razorpayOrderId: { $ne: null },
  })
    .select("_id bookingCode user show seats lockToken razorpayOrderId")
    .lean();

  let expired = 0;
  let skipped = 0;

  for (const booking of pendingBookings) {
    try {
      // Check Razorpay before changing any database records.
      const paymentResponse = await razorpay.orders.fetchPayments(
        booking.razorpayOrderId,
      );

      const payments = paymentResponse.items || [];

      const paymentMayStillSucceed = payments.some(
        (payment) =>
          payment.status === "captured" ||
          payment.status === "authorized" ||
          payment.status === "created",
      );

      if (paymentMayStillSucceed) {
        skipped++;
        continue;
      }

      const session = await mongoose.startSession();

      try {
        let bookingExpired = false;

        await session.withTransaction(async () => {
          const currentBooking = await Booking.findOneAndUpdate(
            {
              _id: booking._id,
              status: "pending",
              paymentStatus: "pending",
              reservationExpiresAt: { $lte: new Date() },
            },
            {
              $set: { status: "expired" },
            },
            {
              new: true,
              session,
            },
          );

          if (!currentBooking) return;

          await ShowSeat.updateMany(
            {
              show: booking.show,
              seat: { $in: booking.seats },
              status: "locked",
              lockedBy: booking.user,
              lockToken: booking.lockToken,
              lockExpiresAt: { $lte: new Date() },
            },
            {
              $set: {
                status: "available",
                lockedBy: null,
                lockToken: null,
                lockExpiresAt: null,
              },
            },
            { session },
          );

          bookingExpired = true;
        });

        if (bookingExpired) {
          expired++;
        } else {
          skipped++;
        }
      } finally {
        await session.endSession();
      }
    } catch (error) {
      skipped++;

      console.error(
        `Booking cleanup skipped ${booking.bookingCode}:`,
        error.message,
      );
    }
  }

  return {
    checked: pendingBookings.length,
    expired,
    skipped,
  };
}
