import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Armchair,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  LoaderCircle,
  RefreshCw,
  Film,
  CircleCheck,
  CircleAlert,
  Wallet,
  ArrowLeft,
  Clapperboard,
} from "lucide-react";
import api from "../lib/api";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

function formatDate(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return "Unavailable";
  }

  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatTime(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return "Unavailable";
  }

  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function StatusBadge({ status, type = "booking" }) {
  const normalized = String(status || "unknown").toLowerCase();

  const bookingStyles = {
    confirmed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    cancelled: "border-red-400/20 bg-red-400/10 text-red-300",
    expired: "border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
  };

  const paymentStyles = {
    paid: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    captured: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    failed: "border-red-400/20 bg-red-400/10 text-red-300",
    refunded: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  };

  const styles = type === "payment" ? paymentStyles : bookingStyles;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        styles[normalized] || "border-white/10 bg-white/5 text-zinc-300"
      }`}
    >
      {normalized}
    </span>
  );
}

function DetailItem({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.07] text-amber-300">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <div className="break-words text-sm font-medium text-zinc-200">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  async function fetchBookings(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  const confirmedCount = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "confirmed" && booking.paymentStatus === "paid",
      ).length,
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    if (activeFilter === "all") return bookings;

    if (activeFilter === "confirmed") {
      return bookings.filter(
        (booking) =>
          booking.status === "confirmed" && booking.paymentStatus === "paid",
      );
    }

    return bookings.filter((booking) => booking.status === activeFilter);
  }, [bookings, activeFilter]);

  const filters = [
    { label: "All bookings", value: "all" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Pending", value: "pending" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Expired", value: "expired" },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#08090d] text-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/[0.06] blur-[120px]" />
        <div className="absolute right-0 top-[45%] h-72 w-72 rounded-full bg-orange-500/[0.04] blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Back navigation */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 rounded-lg text-sm text-zinc-400 transition hover:text-amber-300"
        >
          <ArrowLeft size={17} />
          Back to movies
        </Link>

        {/* Page heading */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.015] p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                <Ticket size={14} />
                Your CINEBOOK tickets
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                My Bookings
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
                All your movie reservations in one place. Check your showtime,
                seats, theater and payment status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchBookings(true)}
              disabled={loading || refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold transition hover:border-amber-300/40 hover:bg-amber-300/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh bookings"}
            </button>
          </div>

          {!loading && !error && (
            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <Ticket size={16} className="text-amber-300" />
                  <span className="text-xs sm:text-sm">Total bookings</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {bookings.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <CircleCheck size={16} className="text-emerald-300" />
                  <span className="text-xs sm:text-sm">Confirmed tickets</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {confirmedCount}
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-white/[0.06] bg-black/20 p-4 sm:col-span-1">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <Film size={16} className="text-sky-300" />
                  <span className="text-xs sm:text-sm">Your movie history</span>
                </div>
                <p className="text-sm font-semibold text-zinc-200">
                  {bookings.length === 0
                    ? "Ready for your first movie?"
                    : "Every booking, all together"}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Loading state */}
        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.02] px-5 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.08]">
              <LoaderCircle size={28} className="animate-spin text-amber-300" />
            </div>
            <h2 className="font-semibold">Finding your tickets</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Please wait while we load your bookings.
            </p>
          </div>
        ) : error ? (
          /* Error state */
          <div className="rounded-3xl border border-red-400/20 bg-red-400/[0.04] p-6 text-center sm:p-10">
            <CircleAlert size={35} className="mx-auto mb-4 text-red-300" />
            <h2 className="text-xl font-bold">Couldn't load bookings</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchBookings()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-200"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        ) : bookings.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-5 py-14 text-center sm:py-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-400/[0.07]">
              <Clapperboard size={38} className="text-amber-300" />
            </div>

            <h2 className="text-2xl font-bold">
              Your next movie adventure awaits
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
              You haven't made a booking yet. Explore the movies, choose your
              seats and your tickets will appear here.
            </p>

            <Link
              to="/"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-3 font-bold text-black transition hover:bg-amber-200"
            >
              <Film size={18} />
              Explore movies
            </Link>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold sm:text-xl">
                  Booking history
                </h2>
                <span className="text-xs text-zinc-500 sm:text-sm">
                  {filteredBookings.length}{" "}
                  {filteredBookings.length === 1 ? "booking" : "bookings"}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      activeFilter === filter.value
                        ? "border-amber-300 bg-amber-300 text-black"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* No matching filter results */}
            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-12 text-center">
                <Ticket size={32} className="mx-auto mb-3 text-zinc-500" />
                <h3 className="font-semibold">No matching bookings</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  There are no bookings in this category.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className="mt-4 text-sm font-semibold text-amber-300 hover:text-amber-200"
                >
                  View all bookings
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredBookings.map((booking) => {
                  const movie = booking.show?.movie;
                  const screen = booking.show?.screen;
                  const theater = screen?.theater;
                  const seats = booking.seats || [];

                  const isConfirmed =
                    booking.status === "confirmed" &&
                    booking.paymentStatus === "paid";

                  const posterUrl = movie?.posterUrl
                    ? movie.posterUrl.startsWith("http")
                      ? movie.posterUrl
                      : `${API_ORIGIN}${movie.posterUrl.startsWith("/") ? "" : "/"}${movie.posterUrl}`
                    : null;

                  return (
                    <article
                      key={booking._id}
                      className="group overflow-hidden rounded-3xl border border-white/[0.09] bg-[#101116] transition duration-300 hover:border-amber-300/20"
                    >
                      {/* Ticket header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.08] text-amber-300">
                            <Ticket size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
                              Booking reference
                            </p>
                            <p className="mt-1 break-all font-mono text-sm font-semibold text-zinc-100 sm:text-base">
                              {booking.bookingCode || booking._id}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={booking.status} />
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                              <CircleCheck size={14} />
                              Valid ticket
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main ticket content */}
                      <div className="grid md:grid-cols-[180px_minmax(0,1fr)]">
                        {/* Poster */}
                        <div className="relative p-4 pb-0 md:p-5 md:pr-0 md:pb-5">
                          <div className="relative h-52 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] sm:h-64 md:h-full md:min-h-64">
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={movie?.title || "Movie poster"}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 text-zinc-600">
                                <Film size={42} />
                                <span className="text-xs">
                                  Poster unavailable
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4 pt-12 md:hidden">
                              <p className="text-xs font-medium text-amber-300">
                                CINEBOOK
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="min-w-0 p-4 sm:p-6 md:p-5 md:pl-6">
                          {/* Movie title and price */}
                          <div className="flex flex-col justify-between gap-4 border-b border-dashed border-white/[0.12] pb-5 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                                Movie ticket
                              </p>

                              <h3 className="break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                                {movie?.title || "Movie details unavailable"}
                              </h3>

                              <p className="mt-2 text-sm text-zinc-400">
                                {movie?.certification ||
                                  "Certification unavailable"}
                                {movie?.durationMinutes
                                  ? ` · ${movie.durationMinutes} min`
                                  : ""}
                              </p>
                            </div>

                            <div className="shrink-0 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 sm:min-w-32 sm:text-right">
                              <p className="text-xs text-zinc-400">
                                Total amount
                              </p>
                              <p className="mt-1 text-2xl font-black text-amber-300">
                                ₹{formatAmount(booking.totalAmount)}
                              </p>
                              <div className="mt-2">
                                <StatusBadge
                                  status={booking.paymentStatus}
                                  type="payment"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Show details */}
                          <div className="grid gap-x-5 gap-y-5 py-5 sm:grid-cols-2">
                            <DetailItem icon={CalendarDays} label="Show date">
                              {formatDate(booking.show?.startTime)}
                            </DetailItem>

                            <DetailItem icon={Clock} label="Showtime">
                              {formatTime(booking.show?.startTime)}
                            </DetailItem>

                            <DetailItem icon={MapPin} label="Cinema">
                              {theater?.name || "Theater unavailable"}
                              <p className="mt-1 text-xs font-normal leading-5 text-zinc-500">
                                {[theater?.addressLine, theater?.city]
                                  .filter(Boolean)
                                  .join(", ") || "Address unavailable"}
                              </p>
                              <p className="mt-1 text-xs font-normal text-zinc-400">
                                {screen?.name || "Screen unavailable"}
                              </p>
                            </DetailItem>

                            <DetailItem icon={Armchair} label="Your seats">
                              {seats.length > 0
                                ? seats.map((seat) => seat.seatLabel).join(", ")
                                : "Seat details unavailable"}
                              {seats.length > 0 && (
                                <p className="mt-1 text-xs font-normal text-zinc-500">
                                  {seats.length}{" "}
                                  {seats.length === 1 ? "seat" : "seats"}{" "}
                                  reserved
                                </p>
                              )}
                            </DetailItem>
                          </div>

                          {/* Booking status notice */}
                          {!isConfirmed && (
                            <div className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3.5">
                              <CircleAlert
                                size={18}
                                className="mt-0.5 shrink-0 text-amber-300"
                              />
                              <div>
                                <p className="text-sm font-semibold text-amber-200">
                                  Booking is not confirmed
                                </p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">
                                  {booking.paymentStatus === "pending"
                                    ? "Payment is not confirmed. This booking should not be treated as a valid ticket."
                                    : "Check the booking and payment status before relying on this reservation."}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Ticket footer */}
                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-white/[0.12] pt-4">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <Wallet size={15} />
                              <span>
                                Payment:{" "}
                                <span className="capitalize text-zinc-300">
                                  {booking.paymentStatus || "unknown"}
                                </span>
                              </span>
                            </div>

                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                              CINEBOOK · Your movie, your moment
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
