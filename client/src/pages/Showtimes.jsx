import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Clock, MapPin, Armchair } from "lucide-react";
import api from "../lib/api";

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

export default function Showtimes() {
  const { slug } = useParams();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchShows() {
      try {
        const response = await api.get("/shows");
        const allShows = response.data?.data?.shows ?? [];

        const movieShows = allShows.filter(
          (show) =>
            show.movie?.slug === slug &&
            show.status === "scheduled" &&
            new Date(show.startTime).getTime() > Date.now(),
        );

        if (!cancelled) {
          setShows(movieShows);
          setSelectedDate(
            movieShows.length
              ? new Date(movieShows[0].startTime).toLocaleDateString("en-CA", {
                  timeZone: "Asia/Kolkata",
                })
              : "",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Could not load showtimes.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchShows();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const dates = [
    ...new Set(
      shows.map((show) =>
        new Date(show.startTime).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }),
      ),
    ),
  ];

  const filteredShows = shows.filter(
    (show) =>
      new Date(show.startTime).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      }) === selectedDate,
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090d] p-10 text-white">
        Loading showtimes...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090d] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to={`/movies/${slug}`}
          className="text-sm text-amber-400 hover:text-amber-300"
        >
          ← Back to movie
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Choose a Showtime</h1>
        <p className="mt-2 text-gray-400">
          Select a date and screening to continue.
        </p>

        {error && <p className="mt-6 text-red-400">{error}</p>}

        {!error && shows.length === 0 && (
          <p className="mt-8 rounded-xl border border-white/10 p-6 text-gray-400">
            No upcoming showtimes are currently available for this movie.
          </p>
        )}

        {dates.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {dates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  selectedDate === date
                    ? "border-amber-400 bg-amber-400 text-black"
                    : "border-white/10 bg-white/5 text-gray-300"
                }`}
              >
                <CalendarDays className="mr-2 inline" size={16} />
                {formatDate(`${date}T12:00:00`)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-5">
          {filteredShows.map((show) => {
            const theater = show.screen?.theater;

            return (
              <article
                key={show._id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-5 sm:flex-row">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {theater?.name || "Theater"}
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      <MapPin className="mr-1 inline" size={15} />
                      {[theater?.city, theater?.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>

                    <p className="mt-2 text-sm text-gray-400">
                      {show.screen?.name} · {show.screen?.screenType}
                    </p>

                    <p className="mt-2 text-sm text-gray-400">
                      <Clock className="mr-1 inline" size={15} />
                      {formatTime(show.startTime)} – {formatTime(show.endTime)}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm text-gray-400">Starting from</p>
                    <p className="mt-1 text-2xl font-bold text-amber-400">
                      ₹{Math.min(...Object.values(show.pricing || {}))}
                    </p>

                    <Link
                      to={`/shows/${show._id}/seats`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black hover:bg-amber-300"
                    >
                      <Armchair size={18} />
                      Select Seats
                    </Link>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4">
                  {Object.entries(show.pricing || {}).map(
                    ([category, price]) => (
                      <span
                        key={category}
                        className="rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-300"
                      >
                        {category}: ₹{price}
                      </span>
                    ),
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
