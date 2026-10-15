import Screen from "../models/screen.model.js";
import Seat from "../models/seat.model.js";
import ShowSeat from "../models/showSeat.model.js";

export const initializeShowSeatInventory = async (show) => {
  const screen = await Screen.findById(show.screen).select("totalSeats status");

  if (!screen || screen.status !== "active") {
    const error = new Error("The show's screen is missing or inactive");
    error.status = 400;
    throw error;
  }

  const allSeats = await Seat.find({ screen: screen._id })
    .select("_id status")
    .lean();

  if (allSeats.length !== screen.totalSeats) {
    const error = new Error(
      `Screen capacity is ${screen.totalSeats}, but ${allSeats.length} seat records exist. Complete the seat layout or correct the screen capacity first.`,
    );
    error.status = 400;
    throw error;
  }

  const activeSeats = allSeats.filter((seat) => seat.status === "active");

  if (activeSeats.length === 0) {
    const error = new Error("This screen has no active seats");
    error.status = 400;
    throw error;
  }

  const operations = activeSeats.map((seat) => ({
    updateOne: {
      filter: {
        show: show._id,
        seat: seat._id,
      },
      update: {
        $setOnInsert: {
          show: show._id,
          seat: seat._id,
          status: "available",
          lockedBy: null,
          lockExpiresAt: null,
        },
      },
      upsert: true,
    },
  }));

  const result = await ShowSeat.bulkWrite(operations, {
    ordered: true,
  });

  return {
    totalActiveSeats: activeSeats.length,
    createdCount: result.upsertedCount,
  };
};
