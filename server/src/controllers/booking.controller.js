import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import Booking from "../models/booking.model.js";
import Show from "../models/show.model.js";
import ShowSeat from "../models/showSeat.model.js";

import { createBookingSchema } from "../utils/booking.validation.js";

export const createBooking = async (req, res, next) => {
  const validation = createBookingSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking request",
      errors: validation.error.issues,
    });
  }

  const { showId, seatIds, lockToken } = validation.data;

  // Always use the authenticated user's ID.
  const userId = req.user._id;

  const session = await mongoose.startSession();

  try {
    let booking;

    await session.withTransaction(async () => {
      const now = new Date();

      // 1. Verify that the show is still available.
      const show = await Show.findById(showId)
        .populate({
          path: "screen",
          select: "status theater",
          populate: {
            path: "theater",
            select: "status",
          },
        })
        .session(session);

      if (!show) {
        const error = new Error("Show not found");
        error.status = 404;
        throw error;
      }

      if (show.status !== "scheduled" || show.startTime <= now) {
        const error = new Error("This show is no longer available");
        error.status = 400;
        throw error;
      }

      if (
        !show.screen ||
        show.screen.status !== "active" ||
        !show.screen.theater ||
        show.screen.theater.status !== "active"
      ) {
        const error = new Error("Screen or theater is inactive");
        error.status = 400;
        throw error;
      }

      // 2. Verify ownership, token, expiry, and seat status.
      const lockedSeats = await ShowSeat.find({
        show: show._id,
        seat: { $in: seatIds },
      })
        .populate("seat", "category status")
        .session(session);

      if (lockedSeats.length !== seatIds.length) {
        const error = new Error("One or more seats do not belong to this show");
        error.status = 400;
        throw error;
      }

      const validLock = lockedSeats.every((item) => {
        return (
          item.status === "locked" &&
          item.lockedBy?.toString() === userId.toString() &&
          item.lockToken === lockToken &&
          item.lockExpiresAt &&
          item.lockExpiresAt > now &&
          item.seat &&
          item.seat.status === "active"
        );
      });

      if (!validLock) {
        const error = new Error(
          "Seat lock is invalid, expired, or no longer belongs to you",
        );
        error.status = 409;
        throw error;
      }

      // 3. Calculate the total on the server.
      const totalAmount = lockedSeats.reduce((total, item) => {
        const category = item.seat.category;
        const price = show.pricing?.[category];

        if (typeof price !== "number" || price < 0) {
          const error = new Error(
            `Valid pricing is missing for ${category} seats`,
          );
          error.status = 400;
          throw error;
        }

        return total + price;
      }, 0);

      // 4. Atomically claim all requested seats.
      // If even one seat cannot be updated, abort the transaction.
      const updateResult = await ShowSeat.updateMany(
        {
          show: show._id,
          seat: { $in: seatIds },
          status: "locked",
          lockedBy: userId,
          lockToken,
          lockExpiresAt: { $gt: new Date() },
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

      if (updateResult.modifiedCount !== seatIds.length) {
        const error = new Error(
          "Seats changed during booking. Please select them again.",
        );
        error.status = 409;
        throw error;
      }

      // 5. Create the booking in the same transaction.
      const bookingCode = `BK-${Date.now()}-${randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;

      const [createdBooking] = await Booking.create(
        [
          {
            bookingCode,
            user: userId,
            show: show._id,
            seats: seatIds,
            lockToken,
            totalAmount,
            status: "pending",
            paymentStatus: "pending",
          },
        ],
        { session },
      );

      booking = createdBooking;
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        showId: booking.show,
        seatIds: booking.seats,
        totalAmount: booking.totalAmount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
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
  } finally {
    await session.endSession();
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const filter = {
      user: req.user._id,
    };

    if (req.query.status) {
      const allowedStatuses = ["pending", "confirmed", "cancelled", "expired"];

      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking status",
        });
      }

      filter.status = req.query.status;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate({
          path: "show",
          populate: [
            {
              path: "movie",
              select: "title posterUrl durationMinutes certification",
            },
            {
              path: "screen",
              select: "name screenType",
              populate: {
                path: "theater",
                select: "name city addressLine",
              },
            },
          ],
        })
        .populate("seats", "rowLabel seatNumber seatLabel category")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      results: bookings.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate({
        path: "show",
        populate: [
          {
            path: "movie",
            select: "title posterUrl durationMinutes certification",
          },
          {
            path: "screen",
            select: "name screenType",
            populate: {
              path: "theater",
              select: "name city addressLine",
            },
          },
        ],
      })
      .populate("seats", "rowLabel seatNumber seatLabel category");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
