import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Armchair, ArrowLeft, Clock, LoaderCircle } from "lucide-react";
import api from "../lib/api";
import RazorpayCheckout from "@razorpay/razorpay-js/checkout";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

export default function SeatSelection() {
  const { showId } = useParams();

  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [locking, setLocking] = useState(false);
  const [lockToken, setLockToken] = useState(null);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [lockError, setLockError] = useState("");

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSeats() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/shows/${showId}/seats`);
        const data = response.data?.data;

        if (!data) {
          throw new Error("Invalid seat availability response.");
        }

        if (!cancelled) {
          setShow(data.show);
          setSeats(data.seats || []);
          setSelectedSeats([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load seat availability.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSeats();

    return () => {
      cancelled = true;
    };
  }, [showId]);

  useEffect(() => {
    if (!lockExpiresAt) return;

    let expirationHandled = false;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(lockExpiresAt).getTime() - Date.now()) / 1000),
      );

      setRemainingSeconds(remaining);

      if (remaining === 0 && !expirationHandled) {
        expirationHandled = true;

        // Clear the expired lock from frontend state
        setLockToken(null);
        setLockExpiresAt(null);
        setRemainingSeconds(0);
        setLocking(false);
        setLockError(
          "Your seat hold has expired. Please try locking your seats again.",
        );

        // Fetch the latest seat availability from the backend
        api
          .get(`/shows/${showId}/seats`)
          .then((response) => {
            const data = response.data?.data;

            if (data) {
              setShow(data.show);
              setSeats(data.seats || []);
            }
          })
          .catch(() => {
            setLockError(
              "Your seat hold expired. Refresh seat availability before continuing.",
            );
          });
      }
    };

    updateCountdown();

    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [lockExpiresAt, showId]);

  const rows = useMemo(() => {
    const grouped = {};

    seats.forEach((item) => {
      const seat = item.seat;
      if (!seat) return;

      if (!grouped[seat.rowLabel]) grouped[seat.rowLabel] = [];
      grouped[seat.rowLabel].push(item);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rowSeats]) => ({
        label,
        seats: rowSeats.sort((a, b) => a.seat.seatNumber - b.seat.seatNumber),
      }));
  }, [seats]);

  const selectedSeatRecords = seats.filter((item) =>
    selectedSeats.includes(item.seat?._id),
  );

  const totalPrice = selectedSeatRecords.reduce(
    (total, item) => total + (show?.pricing?.[item.seat.category] || 0),
    0,
  );

  function toggleSeat(item) {
    if (item.status !== "available") return;

    const seatId = item.seat._id;

    setSelectedSeats((current) =>
      current.includes(seatId)
        ? current.filter((id) => id !== seatId)
        : [...current, seatId],
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090d] text-white">
        <LoaderCircle className="mr-3 animate-spin" />
        Loading seats...
      </main>
    );
  }

  if (error || !show) {
    return (
      <main className="min-h-screen bg-[#08090d] p-8 text-white">
        <p className="text-red-400">{error || "Show not found."}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-5 text-amber-400"
        >
          <ArrowLeft className="mr-2 inline" size={17} />
          Go back
        </button>
      </main>
    );
  }

  const movie = show.movie;

  async function handleContinue() {
    if (selectedSeats.length === 0 || locking) return;

    setLocking(true);
    setLockError("");

    try {
      const response = await api.post("/seat-locks", {
        showId,
        seatIds: selectedSeats,
      });

      const data = response.data?.data;

      if (!data?.lockToken || !data?.expiresAt) {
        throw new Error("The server returned an invalid seat lock response.");
      }

      setLockToken(data.lockToken);
      setLockExpiresAt(data.expiresAt);
      setRemainingSeconds(
        Math.max(
          0,
          Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000),
        ),
      );
    } catch (error) {
      setLockError(
        error.response?.data?.message ||
          "Unable to lock your seats. Please refresh availability and try again.",
      );
    } finally {
      setLocking(false);
    }
  }

  async function handlePayment() {
    if (!lockToken || !lockExpiresAt || paymentLoading) return;

    if (new Date(lockExpiresAt).getTime() <= Date.now()) {
      setPaymentError(
        "Your seat hold has expired. Please select your seats again.",
      );
      setLockToken(null);
      setLockExpiresAt(null);
      return;
    }

    setPaymentLoading(true);
    setPaymentError("");

    try {
      // Create the order using the backend's verified seat lock.
      const orderResponse = await api.post("/payments/order", {
        showId,
        seatIds: selectedSeats,
        lockToken,
      });

      const order = orderResponse.data?.data;

      if (!order?.razorpayOrderId || !order?.keyId) {
        throw new Error(
          "The server did not return valid payment order details.",
        );
      }

      const checkout = await RazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "CINEBOOK",
        description: `Movie tickets - ${movie.title}`,
        order_id: order.razorpayOrderId,
        handler: async (paymentResponse) => {
          try {
            const verificationResponse = await api.post("/payments/verify", {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            const verifiedBooking = verificationResponse.data?.data;

            setBookingSuccess(verifiedBooking);
            setLockToken(null);
            setLockExpiresAt(null);
            setSelectedSeats([]);
            setRemainingSeconds(0);

            // Reload the seats so booked seats display correctly.
            const seatsResponse = await api.get(`/shows/${showId}/seats`);
            const seatData = seatsResponse.data?.data;

            if (seatData) {
              setShow(seatData.show);
              setSeats(seatData.seats || []);
            }
          } catch (error) {
            setPaymentError(
              error.response?.data?.message ||
                "We couldn't confirm the booking. Check your booking status before retrying payment.",
            );
          }
        },
      });

      checkout.on("payment.failed", (event) => {
        setPaymentError(
          event.error?.description ||
            "Payment failed. Your seat hold may still be active.",
        );
      });

      checkout.open();
    } catch (error) {
      setPaymentError(
        error.response?.data?.message ||
          error.message ||
          "Unable to start the payment. Please try again.",
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090d] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to={`/movies/${movie?.slug}/showtimes`}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-amber-400 transition hover:bg-white/5 hover:text-amber-300"
        >
          <ArrowLeft size={17} />
          Back to showtimes
        </Link>

        {/* Movie and show information */}
        <header className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#191923] to-[#101016] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
                Choose your seats
              </p>

              <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                {movie?.title || "Select your seats"}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                {show.screen?.name}
                {show.screen?.screenType ? ` · ${show.screen.screenType}` : ""}
              </p>

              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <Clock size={16} className="shrink-0 text-amber-400" />

                {new Date(show.startTime).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                })}

                <span className="text-slate-600">•</span>

                {formatTime(show.startTime)}
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
              <Armchair size={19} />
              <span>Seat selection</span>
            </div>
          </div>
        </header>

        {/* Seat selection area */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#111117] p-3 sm:p-6 md:p-8">
          <div className="mb-8 text-center sm:mb-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Screen this way
            </p>

            <div className="mx-auto max-w-2xl">
              <div className="h-1 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_18px_rgba(252,211,77,0.22)]" />
              <div className="mx-auto h-5 w-3/4 rounded-b-[50%] border-b border-amber-300/20" />
            </div>
          </div>

          {/* Horizontally scrollable seat map for mobile */}
          <div className="overflow-x-auto overscroll-x-contain pb-4">
            <div className="mx-auto w-max min-w-full space-y-4">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-center gap-2 sm:gap-3"
                >
                  <span className="sticky left-0 z-10 flex h-8 w-6 shrink-0 items-center justify-center rounded bg-[#111117] text-xs font-bold text-slate-500 sm:w-8">
                    {row.label}
                  </span>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {row.seats.map((item) => {
                      const seat = item.seat;
                      const selected = selectedSeats.includes(seat._id);
                      const unavailable = item.status !== "available";

                      let seatStyle =
                        "border-slate-600 bg-slate-800/80 text-slate-300 hover:border-amber-300 hover:bg-slate-700";

                      if (item.status === "booked") {
                        seatStyle =
                          "cursor-not-allowed border-slate-800 bg-slate-800/40 text-slate-600";
                      } else if (item.status === "locked") {
                        seatStyle =
                          "cursor-not-allowed border-orange-900/70 bg-orange-950/60 text-orange-400";
                      } else if (selected) {
                        seatStyle =
                          "border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_12px_rgba(252,211,77,0.2)]";
                      }

                      return (
                        <button
                          key={seat._id}
                          type="button"
                          disabled={unavailable}
                          onClick={() => toggleSeat(item)}
                          aria-pressed={selected}
                          aria-label={`${seat.seatLabel}, ${seat.category}, ${
                            unavailable
                              ? item.status
                              : `₹${show.pricing?.[seat.category] ?? 0}`
                          }`}
                          title={`${seat.seatLabel} · ${seat.category} · ${
                            unavailable
                              ? item.status
                              : `₹${show.pricing?.[seat.category] ?? 0}`
                          }`}
                          className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border text-[10px] transition duration-150 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#111117] disabled:cursor-not-allowed sm:h-11 sm:w-11 sm:rounded-xl sm:text-xs ${seatStyle}`}
                        >
                          <Armchair size={15} className="sm:h-4 sm:w-4" />
                          <span>{seat.seatNumber}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span className="flex h-8 w-6 shrink-0 items-center justify-center rounded bg-[#111117] text-xs font-bold text-slate-500 sm:w-8">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-2 text-center text-xs text-slate-500 sm:hidden">
            Swipe horizontally to view all seats
          </p>

          {/* Seat status legend */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 border-t border-white/5 pt-5 text-xs text-slate-400 sm:gap-x-7">
            {[
              ["bg-slate-800 border-slate-600", "Available"],
              ["bg-amber-300 border-amber-200", "Selected"],
              ["bg-slate-800/40 border-slate-800", "Booked"],
              ["bg-orange-950/60 border-orange-900", "Locked"],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`h-3.5 w-3.5 rounded border ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* Ticket prices */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-[#111117] p-5 sm:p-6">
          <h2 className="font-semibold">Ticket prices</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Object.entries(show.pricing || {}).map(([category, price]) => (
              <div
                key={category}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3"
              >
                <span className="text-sm capitalize text-slate-400">
                  {category}
                </span>
                <span className="font-semibold text-white">₹{price}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Booking and payment summary */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-[#15151d] p-5 sm:p-6">
          {bookingSuccess ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xl text-emerald-400">
                  ✓
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-emerald-400">
                    Booking confirmed!
                  </h2>

                  <p className="mt-2 break-all text-sm text-slate-300">
                    Booking code: {bookingSuccess.bookingCode}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Status: {bookingSuccess.status}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    {selectedSeats.length} seat(s) selected
                  </p>

                  <p className="mt-1 text-3xl font-bold tracking-tight text-amber-300">
                    ₹{totalPrice}
                  </p>

                  {selectedSeatRecords.length > 0 && (
                    <p className="mt-2 max-w-lg break-words text-xs text-slate-500">
                      {selectedSeatRecords
                        .map((item) => item.seat.seatLabel)
                        .join(", ")}
                    </p>
                  )}
                </div>

                <div className="w-full sm:max-w-xs">
                  {lockToken ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 text-sm text-amber-300">
                        <span className="flex items-center gap-2">
                          <Clock size={16} />
                          Hold expires in
                        </span>

                        <span className="font-mono font-bold tabular-nums">
                          {Math.floor(remainingSeconds / 60)}:
                          {String(remainingSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={paymentLoading || remainingSeconds <= 0}
                        className="w-full rounded-xl bg-amber-300 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#15151d] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {paymentLoading
                          ? "Processing payment..."
                          : `Pay ₹${totalPrice}`}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={selectedSeats.length === 0 || locking}
                      className="w-full rounded-xl bg-amber-300 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#15151d] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {locking ? "Locking seats..." : "Continue"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {paymentError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm leading-6 text-red-300"
            >
              {paymentError}
            </p>
          )}

          {lockError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm leading-6 text-red-300"
            >
              {lockError}
            </p>
          )}

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            Your seats are reserved only after a successful seat lock. Complete
            payment before the hold expires.
          </p>
        </section>
      </div>
    </main>
  );
}
