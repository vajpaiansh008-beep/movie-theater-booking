import mongoose from "mongoose";
import Seat from "../models/seat.model.js";
import Screen from "../models/screen.model.js";
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
