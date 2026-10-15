import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },

    seats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seat",
        required: true,
      },
    ],

    lockToken: {
      type: String,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true },
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
