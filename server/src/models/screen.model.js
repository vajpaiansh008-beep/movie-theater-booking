import mongoose from "mongoose";

const screenSchema = new mongoose.Schema(
  {
    theater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    screenType: {
      type: String,
      enum: ["standard", "premium", "imax", "4dx"],
      default: "standard",
    },

    totalSeats: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      validate: {
        validator: Number.isInteger,
        message: "Total seats must be a whole number",
      },
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

// A screen name must be unique within its theater.
screenSchema.index({ theater: 1, name: 1 }, { unique: true });

// Useful for listing active screens within a theater.
screenSchema.index({ theater: 1, status: 1 });

const Screen = mongoose.model("Screen", screenSchema);

export default Screen;
