import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },

    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screen",
      required: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: "End time must be after start time",
      },
    },

    // Ticket prices are stored in INR.
    pricing: {
      standard: {
        type: Number,
        required: true,
        min: 0,
      },

      premium: {
        type: Number,
        required: true,
        min: 0,
      },

      recliner: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
    },

    paymentActivityVersion: {
      type: Number,
      default: 0,
      min: 0,
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

// Supports finding shows scheduled on a screen.
showSchema.index({ screen: 1, startTime: 1 });

// Supports movie showtime listings.
showSchema.index({ movie: 1, status: 1, startTime: 1 });

// Supports finding scheduled shows in a time range.
showSchema.index({ status: 1, startTime: 1 });

const Show = mongoose.model("Show", showSchema);

export default Show;
