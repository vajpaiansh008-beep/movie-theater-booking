import { randomUUID } from "node:crypto";
import Show from "../models/show.model.js";
import ShowSeat from "../models/showSeat.model.js";
import {
  lockSeatsSchema,
  releaseSeatsSchema,
} from "../utils/seatLock.validation.js";

const LOCK_DURATION_MS = 5 * 60 * 1000;

export const lockSeats = async (req, res, next) => {
  let lockToken;

  try {
    const result = lockSeatsSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid seat lock request",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { showId, seatIds } = result.data;
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

    if (show.status !== "scheduled" || show.startTime <= now) {
      return res.status(400).json({
        success: false,
        message: "This show is not available for seat locking",
      });
    }

    if (
      !show.screen ||
      show.screen.status !== "active" ||
      !show.screen.theater ||
      show.screen.theater.status !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message: "The screen or theater is inactive",
      });
    }

    // Verify that every requested seat belongs to this show's inventory.
    const inventory = await ShowSeat.find({
      show: show._id,
      seat: { $in: seatIds },
    })
      .populate("seat", "status")
      .lean();

    if (inventory.length !== seatIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more seats do not belong to this show's inventory",
      });
    }

    if (inventory.some((item) => !item.seat || item.seat.status !== "active")) {
      return res.status(400).json({
        success: false,
        message: "One or more requested seats are inactive",
      });
    }

    lockToken = randomUUID();
    const lockExpiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
    const lockedSeatIds = [];

    // Each conditional update is atomic for its individual seat.
    for (const seatId of seatIds) {
      const lockedSeat = await ShowSeat.findOneAndUpdate(
        {
          show: show._id,
          seat: seatId,
          $or: [
            { status: "available" },
            {
              status: "locked",
              lockExpiresAt: { $lte: now },
            },
          ],
        },
        {
          $set: {
            status: "locked",
            lockedBy: req.user._id,
            lockExpiresAt,
            lockToken,
          },
        },
        { new: true },
      );

      if (!lockedSeat) {
        // Release only the locks created by this request.
        await ShowSeat.updateMany(
          {
            show: show._id,
            status: "locked",
            lockedBy: req.user._id,
            lockToken,
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

        return res.status(409).json({
          success: false,
          message: "One or more seats are already locked or booked",
        });
      }

      lockedSeatIds.push(seatId);
    }

    return res.status(200).json({
      success: true,
      message: "Seats locked successfully",
      data: {
        showId,
        seatIds: lockedSeatIds,
        lockToken,
        expiresAt: lockExpiresAt,
      },
    });
  } catch (error) {
    // If an unexpected error occurs after locking started, clean up this request.
    if (lockToken) {
      await ShowSeat.updateMany(
        {
          status: "locked",
          lockedBy: req.user._id,
          lockToken,
        },
        {
          $set: {
            status: "available",
            lockedBy: null,
            lockExpiresAt: null,
            lockToken: null,
          },
        },
      ).catch(() => {});
    }

    next(error);
  }
};

export const releaseSeats = async (req, res, next) => {
  try {
    const result = releaseSeatsSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid seat release request",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { showId, lockToken } = result.data;

    const releaseResult = await ShowSeat.updateMany(
      {
        show: showId,
        status: "locked",
        lockedBy: req.user._id,
        lockToken,
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

    return res.status(200).json({
      success: true,
      message: "Seat lock release request processed",
      data: {
        releasedCount: releaseResult.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
