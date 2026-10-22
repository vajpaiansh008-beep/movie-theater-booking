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
    <main className="min-h-screen bg-[#08090d] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to={`/movies/${movie?.slug}/showtimes`}
          className="text-sm text-amber-400 hover:text-amber-300"
        >
          <ArrowLeft className="mr-2 inline" size={16} />
          Back to showtimes
        </Link>

        <header className="mt-6 border-b border-white/10 pb-6">
          <h1 className="text-3xl font-bold">
            {movie?.title || "Select your seats"}
          </h1>

          <p className="mt-2 text-gray-400">
            {show.screen?.name} · {show.screen?.screenType}
          </p>

          <p className="mt-2 text-sm text-gray-400">
            <Clock className="mr-2 inline" size={15} />
            {new Date(show.startTime).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}{" "}
            · {formatTime(show.startTime)}
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-8">
          <div className="mx-auto mb-12 max-w-md">
            <div className="h-1 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
            <p className="mt-3 text-center text-xs uppercase tracking-[0.3em] text-gray-500">
              Screen
            </p>
          </div>

          <div className="space-y-5 overflow-x-auto pb-4">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex min-w-max items-center justify-center gap-3"
              >
                <span className="w-5 text-sm font-semibold text-gray-500">
                  {row.label}
                </span>

                {row.seats.map((item) => {
                  const seat = item.seat;
                  const selected = selectedSeats.includes(seat._id);
                  const unavailable = item.status !== "available";

                  let style =
                    "border-white/15 bg-white/5 text-gray-300 hover:border-amber-400";

                  if (item.status === "booked") {
                    style =
                      "cursor-not-allowed border-gray-800 bg-gray-800 text-gray-500";
                  } else if (item.status === "locked") {
                    style =
                      "cursor-not-allowed border-orange-900 bg-orange-950 text-orange-400";
                  } else if (selected) {
                    style = "border-amber-300 bg-amber-400 text-black";
                  }

                  return (
                    <button
                      key={seat._id}
                      type="button"
                      disabled={unavailable}
                      onClick={() => toggleSeat(item)}
                      title={`${seat.seatLabel} · ${seat.category} · ${
                        unavailable
                          ? item.status
                          : `₹${show.pricing?.[seat.category] ?? 0}`
                      }`}
                      className={`flex h-10 w-10 flex-col items-center justify-center rounded-lg border text-xs transition sm:h-11 sm:w-11 ${style}`}
                    >
                      <Armchair size={15} />
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-gray-400">
            <span>
              <span className="mr-2 inline-block h-3 w-3 rounded bg-white/10" />
              Available
            </span>
            <span>
              <span className="mr-2 inline-block h-3 w-3 rounded bg-amber-400" />
              Selected
            </span>
            <span>
              <span className="mr-2 inline-block h-3 w-3 rounded bg-gray-700" />
              Booked
            </span>
            <span>
              <span className="mr-2 inline-block h-3 w-3 rounded bg-orange-900" />
              Locked
            </span>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-semibold">Ticket prices</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.entries(show.pricing || {}).map(([category, price]) => (
              <span
                key={category}
                className="rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-300"
              >
                {category}: ₹{price}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-gray-400">
                {selectedSeats.length} seat(s) selected
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                ₹{totalPrice}
              </p>
            </div>

            {bookingSuccess ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-white">
                <h3 className="text-lg font-semibold text-emerald-400">
                  Booking confirmed!
                </h3>
                <p className="mt-2">
                  Booking code: {bookingSuccess.bookingCode}
                </p>
                <p className="mt-1">Status: {bookingSuccess.status}</p>
              </div>
            ) : lockToken ? (
              <div className="mt-6 space-y-3">
                <p className="flex items-center gap-2 text-amber-400">
                  <Clock size={18} />
                  Seat hold expires in {Math.floor(remainingSeconds / 60)}:
                  {String(remainingSeconds % 60).padStart(2, "0")}
                </p>

                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={paymentLoading || remainingSeconds <= 0}
                  className="w-full rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paymentLoading ? "Processing..." : `Pay ₹${totalPrice}`}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                disabled={selectedSeats.length === 0 || locking}
                className="w-full rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {locking ? "Locking seats..." : "Continue"}
              </button>
            )}

            {paymentError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {paymentError}
              </p>
            )}

            {lockError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {lockError}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
