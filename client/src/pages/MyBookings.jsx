import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Armchair,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import api from "../lib/api";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function StatusBadge({ status }) {
  const styles = {
    confirmed: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
    cancelled: "bg-red-500/15 text-red-400",
    expired: "bg-zinc-500/15 text-zinc-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[status] || styles.expired
      }`}
    >
      {status}
    </span>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchBookings() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/bookings");
      setBookings(response.data?.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your bookings. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <main className="min-h-screen bg-[#08090d] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-amber-400"
        >
          ← Back to movies
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Your tickets
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">My Bookings</h1>
            <p className="mt-2 text-zinc-400">
              View your movie reservations and payment status.
            </p>
          </div>

          <button
            onClick={fetchBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-amber-400/50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-zinc-400">
            <LoaderCircle className="animate-spin" />
            Loading your bookings...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Try again
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <Ticket className="mx-auto mb-4 text-amber-400" size={42} />
            <h2 className="text-xl font-semibold">No bookings yet</h2>
            <p className="mt-2 text-zinc-400">
              Your movie tickets will appear here after you book them.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black hover:bg-amber-300"
            >
              Explore movies
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {bookings.map((booking) => {
              const movie = booking.show?.movie;
              const screen = booking.show?.screen;
              const theater = screen?.theater;
              const seats = booking.seats || [];
              const isConfirmed =
                booking.status === "confirmed" &&
                booking.paymentStatus === "paid";

              return (
                <article
                  key={booking._id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <Ticket className="text-amber-400" size={21} />
                      <div>
                        <p className="text-xs text-zinc-500">Booking code</p>
                        <p className="font-semibold">{booking.bookingCode}</p>
                      </div>
                    </div>

                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-[120px_1fr] sm:p-6">
                    <div className="h-44 overflow-hidden rounded-xl bg-white/5 sm:h-40">
                      {movie?.posterUrl ? (
                        <img
                          src={
                            movie.posterUrl.startsWith("http")
                              ? movie.posterUrl
                              : `${API_ORIGIN}${movie.posterUrl}`
                          }
                          alt={movie.title || "Movie poster"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Ticket size={36} className="text-zinc-600" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold capitalize sm:text-2xl">
                            {movie?.title || "Movie details unavailable"}
                          </h2>
                          <p className="mt-1 text-sm text-zinc-400">
                            {movie?.certification ||
                              "Certification unavailable"}
                            {movie?.durationMinutes
                              ? ` · ${movie.durationMinutes} minutes`
                              : ""}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs text-zinc-500">Total amount</p>
                          <p className="text-xl font-bold text-amber-400">
                            ₹
                            {Number(booking.totalAmount).toLocaleString(
                              "en-IN",
                            )}
                          </p>
                          <p className="text-xs capitalize text-zinc-400">
                            Payment: {booking.paymentStatus}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <CalendarDays
                            size={18}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />
                          <div>
                            <p className="text-zinc-500">Date</p>
                            <p>
                              {booking.show?.startTime
                                ? formatDate(booking.show.startTime)
                                : "Unavailable"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock
                            size={18}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />
                          <div>
                            <p className="text-zinc-500">Showtime</p>
                            <p>
                              {booking.show?.startTime
                                ? formatTime(booking.show.startTime)
                                : "Unavailable"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MapPin
                            size={18}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />
                          <div>
                            <p className="text-zinc-500">Theater</p>
                            <p>{theater?.name || "Unavailable"}</p>
                            <p className="text-xs text-zinc-500">
                              {[theater?.addressLine, theater?.city]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {screen?.name || "Screen unavailable"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Armchair
                            size={18}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />
                          <div>
                            <p className="text-zinc-500">Seats</p>
                            <p>
                              {seats.length
                                ? seats.map((seat) => seat.seatLabel).join(", ")
                                : "Seat details unavailable"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {!isConfirmed && (
                        <p className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
                          {booking.paymentStatus === "pending"
                            ? "Payment is not confirmed. This booking is not a valid ticket yet."
                            : "This booking is not confirmed. Check its current status before making another payment."}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
