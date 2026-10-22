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

    const show = await Show.findById(showId).populate({
      path: "screen",
      select: "status theater",
      populate: {
        path: "theater",
        select: "status",
      },
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

    const totalAmount = lockedSeats.reduce((total, item) => {
      const price = show.pricing?.[item.seat.category];

      if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
        throw Object.assign(
          new Error(`Valid pricing is missing for ${item.seat.category}`),
          { status: 400 },
        );
      }

      return total + price;
    }, 0);

    // Ticket prices are stored in rupees; Razorpay expects paise.
    const amountInPaise = Math.round(totalAmount * 100);

    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: "The total payment must be at least ₹1.00",
      });
    }

    const reservationExpiresAt = lockedSeats.reduce(
      (earliest, item) =>
        item.lockExpiresAt < earliest ? item.lockExpiresAt : earliest,
      lockedSeats[0].lockExpiresAt,
    );

    const bookingCode = `BK-${Date.now()}-${randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    // Create the gateway order before saving the pending booking.
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

    const booking = await Booking.create({
      bookingCode,
      user: userId,
      show: show._id,
      seats: seatIds,
      lockToken,
      reservationExpiresAt,
      totalAmount,
      status: "pending",
      paymentStatus: "pending",
      razorpayOrderId: order.id,
      currency: "INR",
    });

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
        expiresAt: reservationExpiresAt,
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
    // Find only a booking owned by this authenticated user.
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

    // Make repeated verification requests safe.
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

    // Verify the signature using the server-side API secret.
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

    // Independently verify payment details with Razorpay.
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

        // All seats must still belong to this user's active lock.
        const eligibleSeats = await ShowSeat.find({
          show: currentBooking.show,
          seat: { $in: currentBooking.seats },
          status: "locked",
          lockedBy: userId,
          lockToken: currentBooking.lockToken,
          lockExpiresAt: { $gt: now },
        }).session(session);

        if (eligibleSeats.length !== currentBooking.seats.length) {
          // Payment was captured, but the reservation was lost.
          // Do not sell seats that may now belong to another customer.
          currentBooking.status = "expired";
          currentBooking.paymentStatus = "paid";
          currentBooking.razorpayPaymentId = paymentId;

          await currentBooking.save({ session });

          result = { reservationLost: true };
          return;
        }

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

    if (result?.reservationLost) {
      // The captured payment requires refund/reconciliation.
      // Never mark these seats booked for this expired reservation.
      return res.status(409).json({
        success: false,
        message:
          "Payment was captured, but the seat reservation expired. A refund or reconciliation is required.",
        data: {
          bookingId: booking._id,
          paymentStatus: "paid",
          bookingStatus: "expired",
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
