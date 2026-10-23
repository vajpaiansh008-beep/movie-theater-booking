import mongoose from "mongoose";
import Seat from "../models/seat.model.js";
import Screen from "../models/screen.model.js";
import Show from "../models/show.model.js";
import ShowSeat from "../models/showSeat.model.js";
import Booking from "../models/booking.model.js";
import { createSeatsSchema } from "../utils/seat.validation.js";

export const createSeatsBulk = async (req, res, next) => {
  try {
    const result = createSeatsSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid seat details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { screenId, seats } = result.data;

    const screen = await Screen.findById(screenId);

    if (!screen) {
      return res.status(404).json({
        success: false,
        message: "Screen not found",
      });
    }

    if (screen.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot add seats to an inactive screen",
      });
    }

    const existingCount = await Seat.countDocuments({
      screen: screenId,
    });

    if (existingCount + seats.length > screen.totalSeats) {
      return res.status(400).json({
        success: false,
        message: "Seat count exceeds the screen's configured capacity",
        capacity: screen.totalSeats,
        existingSeats: existingCount,
        requestedSeats: seats.length,
      });
    }

    const documents = seats.map((seat) => ({
      ...seat,
      screen: screen._id,
      seatLabel: `${seat.rowLabel}${seat.seatNumber}`,
      createdBy: req.user._id,
    }));

    const createdSeats = await Seat.insertMany(documents, {
      ordered: true,
    });

    return res.status(201).json({
      success: true,
      message: "Seats created successfully",
      data: {
        count: createdSeats.length,
        seats: createdSeats,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "One or more seats already exist in this screen",
      });
    }

    next(error);
  }
};

// Delete all physical seats belonging to one screen.
export const deleteSeatsBulk = async (req, res, next) => {
  try {
    const { screenId } = req.body;

    if (typeof screenId !== "string" || !mongoose.isValidObjectId(screenId)) {
      return res.status(400).json({
        success: false,
        message: "A valid screenId is required in the request body",
      });
    }

    const screen = await Screen.findById(screenId)
      .select("_id name totalSeats")
      .lean();

    if (!screen) {
      return res.status(404).json({
        success: false,
        message: "Screen not found",
      });
    }

    const seats = await Seat.find({ screen: screenId }).select("_id").lean();

    if (seats.length === 0) {
      return res.status(200).json({
        success: true,
        message: "This screen has no seats to delete",
        data: {
          screenId,
          deletedCount: 0,
        },
      });
    }

    const seatIds = seats.map((seat) => seat._id);

    // A screen with show history must retain its seat records.
    const shows = await Show.find({ screen: screenId }).select("_id").lean();

    const showIds = shows.map((show) => show._id);

    const [showSeatCount, bookingCount] = await Promise.all([
      ShowSeat.countDocuments({
        $or: [{ seat: { $in: seatIds } }, { show: { $in: showIds } }],
      }),
      Booking.countDocuments({
        $or: [{ seats: { $in: seatIds } }, { show: { $in: showIds } }],
      }),
    ]);

    if (shows.length > 0 || showSeatCount > 0 || bookingCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "These seats cannot be deleted because this screen has show, seat-lock, or booking dependencies. Preserve the records and deactivate the screen or correct the layout without deleting referenced seats.",
        data: {
          screenId,
          physicalSeats: seats.length,
          shows: shows.length,
          showSeatRecords: showSeatCount,
          bookings: bookingCount,
        },
      });
    }

    // Delete only after all dependency checks pass.
    const result = await Seat.deleteMany({
      screen: screenId,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} seats from ${screen.name}`,
      data: {
        screenId,
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getScreenSeats = async (req, res, next) => {
  try {
    const { screenId } = req.query;

    if (typeof screenId !== "string" || !mongoose.isValidObjectId(screenId)) {
      return res.status(400).json({
        success: false,
        message: "A valid screenId query parameter is required",
      });
    }

    const screen = await Screen.findById(screenId)
      .select("name theater totalSeats status")
      .lean();

    if (!screen) {
      return res.status(404).json({
        success: false,
        message: "Screen not found",
      });
    }

    const seats = await Seat.find({ screen: screenId })
      .sort({ rowLabel: 1, seatNumber: 1 })
      .select("-createdBy -__v")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        screen,
        totalSeats: seats.length,
        seats,
      },
    });
  } catch (error) {
    next(error);
  }
};
