import mongoose from "mongoose";

const showSeatSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },

    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "locked", "booked"],
      default: "available",
      required: true,
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lockToken: {
      type: String,
      default: null,
    },

    lockExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// A physical seat can appear only once in a particular show.
showSeatSchema.index({ show: 1, seat: 1 }, { unique: true });

// Supports loading a show's seat availability.
showSeatSchema.index({ show: 1, status: 1 });

// Supports finding expired seat locks.
showSeatSchema.index({ status: 1, lockExpiresAt: 1 });

const ShowSeat = mongoose.model("ShowSeat", showSeatSchema);

export default ShowSeat;
