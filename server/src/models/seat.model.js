import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screen",
      required: true,
    },

    rowLabel: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{1,3}$/,
    },

    seatNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      validate: {
        validator: Number.isInteger,
        message: "Seat number must be a whole number",
      },
    },

    seatLabel: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    category: {
      type: String,
      enum: ["standard", "premium", "recliner"],
      default: "standard",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate seat numbers within the same row and screen.
seatSchema.index({ screen: 1, rowLabel: 1, seatNumber: 1 }, { unique: true });

// Also prevent duplicate display labels within a screen.
seatSchema.index({ screen: 1, seatLabel: 1 }, { unique: true });

// Useful for loading a screen's seat layout.
seatSchema.index({ screen: 1, status: 1 });

const Seat = mongoose.model("Seat", seatSchema);

export default Seat;
