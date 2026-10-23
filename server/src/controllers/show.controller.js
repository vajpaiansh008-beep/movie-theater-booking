import mongoose from "mongoose";
import Show from "../models/show.model.js";
import Movie from "../models/movie.model.js";
import Screen from "../models/screen.model.js";
import Theater from "../models/theater.model.js";
import { createShowSchema } from "../utils/show.validation.js";
import ShowSeat from "../models/showSeat.model.js";
import { initializeShowSeatInventory } from "../utils/initializeShowSeatInventory.js";

export const createShow = async (req, res, next) => {
  try {
    const result = createShowSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid show details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { movieId, screenId, startTime, bufferMinutes, pricing } =
      result.data;

    if (startTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Show start time must be in the future",
      });
    }

    const [movie, screen] = await Promise.all([
      Movie.findById(movieId),
      Screen.findById(screenId),
    ]);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    if (movie.status !== "published" || movie.releaseStatus === "ended") {
      return res.status(400).json({
        success: false,
        message: "Only published movies that have not ended can be scheduled",
      });
    }

    if (!screen) {
      return res.status(404).json({
        success: false,
        message: "Screen not found",
      });
    }

    if (screen.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot schedule a show on an inactive screen",
      });
    }

    const theater = await Theater.findById(screen.theater);

    if (!theater || theater.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "The screen's theater is missing or inactive",
      });
    }

    const endTime = new Date(
      startTime.getTime() + (movie.durationMinutes + bufferMinutes) * 60 * 1000,
    );

    // A scheduled show must not overlap another scheduled show on this screen.
    const overlappingShow = await Show.findOne({
      screen: screen._id,
      status: "scheduled",
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }).select("_id startTime endTime");

    if (overlappingShow) {
      return res.status(409).json({
        success: false,
        message: "This screen already has a show scheduled during that time",
        conflictingShow: overlappingShow,
      });
    }

    const show = await Show.create({
      movie: movie._id,
      screen: screen._id,
      startTime,
      endTime,
      pricing,
      createdBy: req.user._id,
    });

    try {
      await initializeShowSeatInventory(show);
    } catch (error) {
      // Roll back the newly created show and any partial inventory.
      await ShowSeat.deleteMany({ show: show._id });
      await Show.deleteOne({ _id: show._id });
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Show scheduled successfully",
      data: { show },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllShows = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(50, Math.max(1, requestedLimit));

    const filter = {};

    for (const field of ["movieId", "screenId"]) {
      if (req.query[field] !== undefined) {
        if (
          typeof req.query[field] !== "string" ||
          !mongoose.isValidObjectId(req.query[field])
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field}`,
          });
        }

        filter[field === "movieId" ? "movie" : "screen"] = req.query[field];
      }
    }

    if (req.query.status !== undefined) {
      if (
        typeof req.query.status !== "string" ||
        !["scheduled", "cancelled", "completed"].includes(req.query.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid show status",
        });
      }

      filter.status = req.query.status;
    }

    const [shows, totalShows] = await Promise.all([
      Show.find(filter)
        .populate("movie", "title slug durationMinutes posterUrl")
        .populate({
          path: "screen",
          select: "name screenType theater",
          populate: { path: "theater", select: "name city state" },
        })
        .sort({ startTime: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Show.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        shows,
        pagination: {
          currentPage: page,
          limit,
          totalShows,
          totalPages: Math.ceil(totalShows / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelShow = async (req, res, next) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid show ID",
      });
    }

    session = await mongoose.startSession();

    let cancelledShow = null;

    await session.withTransaction(async () => {
      const now = new Date();

      // 1. Cancel only a future show that is still scheduled.
      const show = await Show.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "scheduled",
          startTime: { $gt: now },
        },
        {
          $set: { status: "cancelled" },
          $inc: { paymentActivityVersion: 1 },
        },
        {
          returnDocument: "after",
          runValidators: true,
          session,
        },
      );

      if (!show) {
        return;
      }

      // 2. Release only locked seats for this show.
      // Seats already marked "booked" remain untouched.
      await ShowSeat.updateMany(
        {
          show: show._id,
          status: "locked",
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

      cancelledShow = show;
    });

    await session.endSession();
    session = null;

    if (cancelledShow) {
      return res.status(200).json({
        success: true,
        message: "Show cancelled and active seat locks released",
        data: {
          show: cancelledShow,
        },
      });
    }

    // 3. Explain why the show could not be cancelled.
    const existingShow = await Show.findById(req.params.id).select(
      "_id status startTime",
    );

    if (!existingShow) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    if (existingShow.status === "cancelled") {
      return res.status(409).json({
        success: false,
        message: "This show is already cancelled",
      });
    }

    if (existingShow.startTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "A show that has already started cannot be cancelled",
      });
    }

    return res.status(409).json({
      success: false,
      message: "Only scheduled shows can be cancelled",
    });
  } catch (error) {
    if (session) {
      await session.endSession();
    }

    return next(error);
  }
};

export const initializeShowSeats = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid show ID",
      });
    }

    const show = await Show.findById(req.params.id);

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    if (show.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled shows can initialize seat inventory",
      });
    }

    const result = await initializeShowSeatInventory(show);

    return res.status(200).json({
      success: true,
      message: "Show seat inventory initialized",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getShowSeatAvailability = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid show ID",
      });
    }

    const show = await Show.findById(req.params.id)
      .populate("movie", "title slug durationMinutes")
      .populate("screen", "name screenType theater")
      .lean();

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    await ShowSeat.updateMany(
      {
        show: show._id,
        status: "locked",
        lockExpiresAt: { $lte: new Date() },
      },
      {
        $set: {
          status: "available",
          lockedBy: null,
          lockExpiresAt: null,
          lockToken: null,
        },
      },
    );

    const showSeats = await ShowSeat.find({ show: show._id })
      .populate({
        path: "seat",
        select: "rowLabel seatNumber seatLabel category",
      })
      .lean();

    showSeats.sort((a, b) => {
      const rowComparison = a.seat.rowLabel.localeCompare(b.seat.rowLabel);
      return rowComparison || a.seat.seatNumber - b.seat.seatNumber;
    });

    const counts = {
      available: 0,
      locked: 0,
      booked: 0,
    };

    for (const item of showSeats) {
      counts[item.status]++;
    }

    return res.status(200).json({
      success: true,
      data: {
        show,
        summary: {
          totalInventorySeats: showSeats.length,
          ...counts,
        },
        seats: showSeats,
      },
    });
  } catch (error) {
    next(error);
  }
};
