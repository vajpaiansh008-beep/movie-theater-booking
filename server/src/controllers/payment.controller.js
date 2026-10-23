import mongoose from "mongoose";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

import razorpay from "../config/razorpay.js";
import Booking from "../models/booking.model.js";
import Show from "../models/show.model.js";
import ShowSeat from "../models/showSeat.model.js";
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from "../utils/payment.validation.js";

export const createPaymentOrder = async (req, res, next) => {
  const validation = createPaymentOrderSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment order request",
      errors: validation.error.issues,
    });
  }

  const { showId, seatIds, lockToken } = validation.data;
  const userId = req.user._id;

  try {
    const now = new Date();

    // 1. Preflight: validate the show before creating a Razorpay order.
    const show = await Show.findById(showId).populate({
      path: "screen",
      populate: { path: "theater" },
    });

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    if (
      show.status !== "scheduled" ||
      show.startTime <= now ||
      !show.screen ||
      show.screen.status !== "active" ||
      !show.screen.theater ||
      show.screen.theater.status !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message: "This show is no longer available",
      });
    }

    // 2. Validate the customer's seat locks.
    const lockedSeats = await ShowSeat.find({
      show: show._id,
      seat: { $in: seatIds },
    })
      .populate("seat", "category status")
      .lean();

    if (lockedSeats.length !== seatIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more seats do not belong to this show",
      });
    }

    const allLocksValid = lockedSeats.every(
      (item) =>
        item.status === "locked" &&
        item.lockedBy?.toString() === userId.toString() &&
        item.lockToken === lockToken &&
        item.lockExpiresAt &&
        item.lockExpiresAt > now &&
        item.seat?.status === "active",
    );

    if (!allLocksValid) {
      return res.status(409).json({
        success: false,
        message: "Your seat lock is invalid or expired. Select seats again.",
      });
    }

    // 3. Calculate the amount on the server.
    const totalAmount = lockedSeats.reduce((total, item) => {
      const price = show.pricing?.[item.seat.category];

      if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
        const error = new Error(
          `Valid pricing is missing for ${item.seat.category}`,
        );
        error.status = 400;
        throw error;
      }

      return total + price;
    }, 0);

    const amountInPaise = Math.round(totalAmount * 100);

    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: "The total payment must be at least ₹1.00",
      });
    }

    const bookingCode = `BK-${Date.now()}-${randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    // 4. Create the Razorpay order OUTSIDE the MongoDB transaction.
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: bookingCode,
      partial_payment: false,
      notes: {
        bookingCode,
        userId: userId.toString(),
        showId: show._id.toString(),
      },
    });

    // 5. Revalidate and coordinate with cancellation transactionally.
    const session = await mongoose.startSession();

    let booking;

    try {
      await session.withTransaction(async () => {
        const transactionNow = new Date();

        // This is a conditional WRITE to the Show document.
        // cancelShow also writes to this document, so concurrent
        // transactions can conflict instead of silently racing.
        const currentShow = await Show.findOneAndUpdate(
          {
            _id: showId,
            status: "scheduled",
            startTime: { $gt: transactionNow },
          },
          {
            $inc: { paymentActivityVersion: 1 },
          },
          {
            returnDocument: "after",
            session,
            runValidators: true,
          },
        ).populate({
          path: "screen",
          select: "status theater",
          populate: {
            path: "theater",
            select: "status",
          },
        });

        if (
          !currentShow ||
          !currentShow.screen ||
          currentShow.screen.status !== "active" ||
          !currentShow.screen.theater ||
          currentShow.screen.theater.status !== "active"
        ) {
          const error = new Error(
            "This show is no longer available. Please select another show.",
          );
          error.status = 409;
          throw error;
        }

        // Recheck every seat lock inside the transaction.
        const currentSeats = await ShowSeat.find({
          show: currentShow._id,
          seat: { $in: seatIds },
        })
          .populate("seat", "category status")
          .session(session);

        const validLocks =
          currentSeats.length === seatIds.length &&
          currentSeats.every(
            (item) =>
              item.status === "locked" &&
              item.lockedBy?.toString() === userId.toString() &&
              item.lockToken === lockToken &&
              item.lockExpiresAt &&
              item.lockExpiresAt > transactionNow &&
              item.seat &&
              item.seat.status === "active",
          );

        if (!validLocks) {
          const error = new Error(
            "Your seat reservation expired or changed. Please select seats again.",
          );
          error.status = 409;
          throw error;
        }

        // Recalculate the price in case show pricing changed
        // while the Razorpay order was being created.
        const currentTotalAmount = currentSeats.reduce((total, item) => {
          const price = currentShow.pricing?.[item.seat.category];

          if (
            typeof price !== "number" ||
            !Number.isFinite(price) ||
            price < 0
          ) {
            const error = new Error(
              `Valid pricing is missing for ${item.seat.category}`,
            );
            error.status = 400;
            throw error;
          }

          return total + price;
        }, 0);

        const currentAmountInPaise = Math.round(currentTotalAmount * 100);

        if (currentAmountInPaise !== order.amount) {
          const error = new Error(
            "Show pricing changed. Please restart the payment process.",
          );
          error.status = 409;
          throw error;
        }

        // Keep the reservation expiry aligned with the current locks.
        const reservationExpiresAt = currentSeats.reduce(
          (earliest, item) =>
            item.lockExpiresAt < earliest ? item.lockExpiresAt : earliest,
          currentSeats[0].lockExpiresAt,
        );

        // 6. Create the pending booking transactionally.
        const [createdBooking] = await Booking.create(
          [
            {
              bookingCode,
              user: userId,
              show: currentShow._id,
              seats: seatIds,
              lockToken,
              reservationExpiresAt,
              totalAmount: currentTotalAmount,
              status: "pending",
              paymentStatus: "pending",
              razorpayOrderId: order.id,
              currency: "INR",
            },
          ],
          { session },
        );

        booking = createdBooking;
      });
    } finally {
      await session.endSession();
    }

    // 7. Return the order and booking details.
    return res.status(201).json({
      success: true,
      message: "Payment order created",
      data: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        totalAmount: booking.totalAmount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        expiresAt: booking.reservationExpiresAt,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

//session.withTransaction

export const verifyPayment = async (req, res, next) => {
  const validation = verifyPaymentSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment verification request",
      errors: validation.error.issues,
    });
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = validation.data;

  const userId = req.user._id;

  try {
    // 1. Find the booking belonging to the authenticated user.
    const booking = await Booking.findOne({
      user: userId,
      razorpayOrderId: orderId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Payment booking not found",
      });
    }

    // 2. Make repeated successful verification requests idempotent.
    if (
      booking.status === "confirmed" &&
      booking.paymentStatus === "paid" &&
      booking.razorpayPaymentId === paymentId
    ) {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        data: {
          bookingId: booking._id,
          bookingCode: booking.bookingCode,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
        },
      });
    }

    if (booking.status !== "pending" || booking.paymentStatus !== "pending") {
      return res.status(409).json({
        success: false,
        message: "This booking is no longer awaiting payment",
      });
    }

    // 3. Verify the Razorpay signature.
    const expectedSignature = createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET,
    )
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const suppliedBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed",
      });
    }

    // 4. Independently verify payment details with Razorpay.
    const payment = await razorpay.payments.fetch(paymentId);

    if (
      payment.order_id !== orderId ||
      payment.currency !== booking.currency ||
      payment.amount !== Math.round(booking.totalAmount * 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details do not match the booking",
      });
    }

    if (payment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message: "Payment has not been captured yet",
        paymentStatus: payment.status,
      });
    }

    // 5. Coordinate payment confirmation with show cancellation.
    const session = await mongoose.startSession();

    let result;

    try {
      await session.withTransaction(async () => {
        const currentBooking = await Booking.findOne({
          _id: booking._id,
          user: userId,
          razorpayOrderId: orderId,
          status: "pending",
          paymentStatus: "pending",
        }).session(session);

        if (!currentBooking) {
          const error = new Error(
            "Booking has already been processed or is no longer pending",
          );
          error.status = 409;
          throw error;
        }

        const now = new Date();

        // Write to the same Show document cancellation updates.
        // This creates a write conflict when concurrent transactions
        // try to modify the same show.
        const currentShow = await Show.findOneAndUpdate(
          {
            _id: currentBooking.show,
            status: "scheduled",
            startTime: { $gt: now },
          },
          {
            $inc: { paymentActivityVersion: 1 },
          },
          {
            returnDocument: "after",
            session,
            runValidators: true,
          },
        );

        if (!currentShow) {
          const showState = await Show.findById(currentBooking.show)
            .select("status startTime")
            .session(session);

          // Payment has already been captured.
          // Preserve its record for refund/reconciliation.
          currentBooking.status =
            showState?.status === "cancelled" ? "cancelled" : "expired";

          currentBooking.paymentStatus = "paid";
          currentBooking.razorpayPaymentId = paymentId;

          await currentBooking.save({ session });

          // Release only locks still belonging to this reservation.
          await ShowSeat.updateMany(
            {
              show: currentBooking.show,
              seat: { $in: currentBooking.seats },
              status: "locked",
              lockedBy: userId,
              lockToken: currentBooking.lockToken,
            },
            {
              $set: {
                status: "available",
                lockedBy: null,
                lockExpiresAt: null,
                lockToken: null,
              },
            },
            { session },
          );

          result = {
            reservationLost: true,
            bookingStatus: currentBooking.status,
          };

          return;
        }

        // 6. Verify that every seat is still locked for this booking.
        const eligibleSeats = await ShowSeat.find({
          show: currentBooking.show,
          seat: { $in: currentBooking.seats },
          status: "locked",
          lockedBy: userId,
          lockToken: currentBooking.lockToken,
          lockExpiresAt: { $gt: now },
        }).session(session);

        if (eligibleSeats.length !== currentBooking.seats.length) {
          currentBooking.status = "expired";
          currentBooking.paymentStatus = "paid";
          currentBooking.razorpayPaymentId = paymentId;

          await currentBooking.save({ session });

          // Release any remaining locks that still match this booking.
          await ShowSeat.updateMany(
            {
              show: currentBooking.show,
              seat: { $in: currentBooking.seats },
              status: "locked",
              lockedBy: userId,
              lockToken: currentBooking.lockToken,
            },
            {
              $set: {
                status: "available",
                lockedBy: null,
                lockExpiresAt: null,
                lockToken: null,
              },
            },
            { session },
          );

          result = {
            reservationLost: true,
            bookingStatus: currentBooking.status,
          };

          return;
        }

        // 7. Atomically mark all reserved seats as booked.
        const seatUpdate = await ShowSeat.updateMany(
          {
            show: currentBooking.show,
            seat: { $in: currentBooking.seats },
            status: "locked",
            lockedBy: userId,
            lockToken: currentBooking.lockToken,
            lockExpiresAt: { $gt: now },
          },
          {
            $set: {
              status: "booked",
              lockedBy: null,
              lockExpiresAt: null,
              lockToken: null,
            },
          },
          { session },
        );

        if (seatUpdate.modifiedCount !== currentBooking.seats.length) {
          const error = new Error(
            "Seat state changed during payment confirmation",
          );
          error.status = 409;
          throw error;
        }

        // 8. Confirm booking after all seat updates succeed.
        currentBooking.status = "confirmed";
        currentBooking.paymentStatus = "paid";
        currentBooking.razorpayPaymentId = paymentId;

        await currentBooking.save({ session });

        result = {
          reservationLost: false,
          booking: currentBooking,
        };
      });
    } finally {
      await session.endSession();
    }

    // 9. Captured payment without a confirmed booking needs reconciliation.
    if (result?.reservationLost) {
      return res.status(409).json({
        success: false,
        message:
          "Payment was captured, but the booking could not be confirmed. A refund or reconciliation is required.",
        data: {
          bookingId: booking._id,
          paymentStatus: "paid",
          bookingStatus: result.bookingStatus,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and booking confirmed",
      data: {
        bookingId: result.booking._id,
        bookingCode: result.booking.bookingCode,
        totalAmount: result.booking.totalAmount,
        currency: result.booking.currency,
        status: result.booking.status,
        paymentStatus: result.booking.paymentStatus,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};
