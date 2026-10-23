import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

const emptyForm = {
  movieId: "",
  screenId: "",
  startTime: "",
  bufferMinutes: "15",
  standard: "200",
  premium: "300",
  recliner: "500",
};

const statusStyles = {
  scheduled: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
  completed: "bg-slate-500/10 text-slate-400",
};

function formatDateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getLocalDateTimeInput() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}

export default function AdminShows() {
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [screens, setScreens] = useState([]);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalShows: 0,
  });

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    ...emptyForm,
    startTime: getLocalDateTimeInput(),
  });

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchShows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, limit: 10 };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await api.get("/admin/shows", { params });
      const data = response.data.data;

      setShows(data.shows || []);
      setPagination(
        data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalShows: 0,
        },
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load shows. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchFormOptions = useCallback(async () => {
    setOptionsLoading(true);
    setFormError("");

    try {
      // Fetch the first page to discover how many pages exist.
      const [firstMoviesResponse, screensResponse] = await Promise.all([
        api.get("/admin/movies", {
          params: { page: 1, limit: 50, status: "published" },
        }),
        api.get("/admin/screens", {
          params: { page: 1, limit: 50, status: "active" },
        }),
      ]);

      const firstMovieData = firstMoviesResponse.data.data;
      const totalPages = firstMovieData.pagination?.totalPages || 1;

      // Fetch any remaining movie pages.
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          api.get("/admin/movies", {
            params: {
              page: index + 2,
              limit: 50,
              status: "published",
            },
          }),
        ),
      );

      const allMovies = [
        ...(firstMovieData.movies || []),
        ...remainingPages.flatMap(
          (response) => response.data.data.movies || [],
        ),
      ];

      setMovies(
        allMovies.filter(
          (movie) =>
            movie.status === "published" && movie.releaseStatus !== "ended",
        ),
      );

      const screenData = screensResponse.data.data;

      setScreens(
        (screenData.screens || []).filter(
          (screen) => screen.status === "active",
        ),
      );
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to load movies and screens for scheduling.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  useEffect(() => {
    fetchFormOptions();
  }, [fetchFormOptions]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
    setSuccessMessage("");
  };

  const handleCreateShow = async (event) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!form.movieId || !form.screenId || !form.startTime) {
      setFormError("Select a movie, screen, and start time.");
      return;
    }

    const startTime = new Date(form.startTime);

    if (Number.isNaN(startTime.getTime()) || startTime <= new Date()) {
      setFormError("Show start time must be in the future.");
      return;
    }

    const bufferMinutes = Number(form.bufferMinutes);
    const standard = Number(form.standard);
    const premium = Number(form.premium);
    const recliner = Number(form.recliner);

    if (
      !Number.isInteger(bufferMinutes) ||
      bufferMinutes < 0 ||
      bufferMinutes > 60
    ) {
      setFormError("Buffer must be between 0 and 60 minutes.");
      return;
    }

    if (
      [standard, premium, recliner].some(
        (price) => !Number.isFinite(price) || price < 0 || price > 100000,
      )
    ) {
      setFormError("Ticket prices must be between ₹0 and ₹100,000.");
      return;
    }

    setCreating(true);

    try {
      await api.post("/admin/shows", {
        movieId: form.movieId,
        screenId: form.screenId,
        startTime: startTime.toISOString(),
        bufferMinutes,
        pricing: { standard, premium, recliner },
      });

      setSuccessMessage(
        "Show scheduled successfully and seat inventory initialized.",
      );

      setForm({
        ...emptyForm,
        startTime: getLocalDateTimeInput(),
      });

      setShowForm(false);
      setPage(1);

      if (page === 1) {
        await fetchShows();
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to schedule this show. Please check the details.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCancelShow = async () => {
    if (!cancelTarget || cancellingId) return;

    const showId = cancelTarget._id;

    setCancellingId(showId);
    setError("");
    setSuccessMessage("");

    try {
      await api.patch(`/admin/shows/${showId}/cancel`);

      setSuccessMessage("Show cancelled successfully.");

      setCancelTarget(null);

      await fetchShows();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to cancel this show. Please try again.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const changeStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Link
              to="/admin"
              className="text-xl font-bold tracking-wider text-red-500"
            >
              CINEBOOK
            </Link>
            <p className="mt-1 text-sm text-slate-400">Admin workspace</p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              Dashboard
            </Link>

            <Link
              to="/admin/screens"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              Screens
            </Link>
          </div>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-4 py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              Cinema management
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Show Scheduling
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Schedule screenings and manage your cinema timetable.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setFormError("");
              setSuccessMessage("");
            }}
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500"
          >
            {showForm ? "Close form" : "+ Schedule a show"}
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
            <button
              type="button"
              onClick={fetchShows}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {successMessage}
          </div>
        )}

        {showForm && (
          <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Schedule a new show</h2>

            <p className="mt-2 text-sm text-slate-400">
              The backend will calculate the end time, validate screen
              conflicts, and initialize show-seat inventory.
            </p>

            {formError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {formError}
              </div>
            )}

            {optionsLoading ? (
              <p className="py-8 text-sm text-slate-400">
                Loading movies and screens...
              </p>
            ) : (
              <form
                onSubmit={handleCreateShow}
                className="mt-6 grid gap-5 sm:grid-cols-2"
              >
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Movie
                  </span>
                  <select
                    value={form.movieId}
                    onChange={(event) =>
                      updateForm("movieId", event.target.value)
                    }
                    required
                    disabled={creating}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 outline-none focus:border-red-500"
                  >
                    <option value="">Select a movie</option>
                    {movies.map((movie) => (
                      <option key={movie._id} value={movie._id}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                  {movies.length === 0 && (
                    <span className="mt-2 block text-xs text-amber-300">
                      No eligible published movies found.
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Screen
                  </span>
                  <select
                    value={form.screenId}
                    onChange={(event) =>
                      updateForm("screenId", event.target.value)
                    }
                    required
                    disabled={creating}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 outline-none focus:border-red-500"
                  >
                    <option value="">Select a screen</option>
                    {screens.map((screen) => (
                      <option key={screen._id} value={screen._id}>
                        {screen.name}
                        {screen.theater?.name
                          ? ` — ${screen.theater.name}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {screens.length === 0 && (
                    <span className="mt-2 block text-xs text-amber-300">
                      No active screens found.
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Start date and time
                  </span>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(event) =>
                      updateForm("startTime", event.target.value)
                    }
                    required
                    disabled={creating}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 outline-none focus:border-red-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Buffer between shows (minutes)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    value={form.bufferMinutes}
                    onChange={(event) =>
                      updateForm("bufferMinutes", event.target.value)
                    }
                    required
                    disabled={creating}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 outline-none focus:border-red-500"
                  />
                </label>

                <div className="sm:col-span-2">
                  <h3 className="text-lg font-semibold">
                    Ticket pricing (INR)
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Configure prices for each physical seat category.
                  </p>
                </div>

                {[
                  ["standard", "Standard price (₹)"],
                  ["premium", "Premium price (₹)"],
                  ["recliner", "Recliner price (₹)"],
                ].map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="mb-2 block text-sm text-slate-300">
                      {label}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      value={form[field]}
                      onChange={(event) =>
                        updateForm(field, event.target.value)
                      }
                      required
                      disabled={creating}
                      className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 outline-none focus:border-red-500"
                    />
                  </label>
                ))}

                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={
                      creating ||
                      optionsLoading ||
                      movies.length === 0 ||
                      screens.length === 0
                    }
                    className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {creating ? "Scheduling..." : "Create show"}
                  </button>

                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      setShowForm(false);
                      setFormError("");
                    }}
                    className="rounded-lg border border-white/15 px-5 py-3 text-sm hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Scheduled shows</h2>
              <p className="mt-1 text-sm text-slate-400">
                {pagination.totalShows} total shows
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => changeStatusFilter(event.target.value)}
              className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-red-500"
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              Loading shows...
            </div>
          ) : shows.length === 0 ? (
            <div className="py-16 text-center">
              <h3 className="font-semibold">No shows found</h3>
              <p className="mt-2 text-sm text-slate-400">
                Schedule a show or change the status filter.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-4 md:hidden">
                {shows.map((show) => (
                  <article
                    key={show._id}
                    className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {show.movie?.title || "Movie unavailable"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {show.screen?.name || "Screen unavailable"}
                        </p>
                        <p className="text-sm text-slate-400">
                          {show.screen?.theater?.name || "Theater unavailable"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          statusStyles[show.status] || ""
                        }`}
                      >
                        {show.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-300">
                      <p>Starts: {formatDateTime(show.startTime)}</p>
                      <p>Ends: {formatDateTime(show.endTime)}</p>
                      <p>Standard: ₹{show.pricing?.standard}</p>
                      <p>Premium: ₹{show.pricing?.premium}</p>
                      <p>Recliner: ₹{show.pricing?.recliner}</p>
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {show.status === "cancelled" ? (
                        <button
                          type="button"
                          disabled
                          className="w-full rounded-lg border border-slate-500/30
        bg-slate-500/10 px-4 py-3 text-sm font-medium
        text-slate-400 opacity-80"
                        >
                          ✓ Already Cancelled
                        </button>
                      ) : show.status === "scheduled" &&
                        new Date(show.startTime) > new Date() ? (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(show)}
                          disabled={Boolean(cancellingId)}
                          className="w-full rounded-lg border border-red-500/40
        bg-red-500/10 px-4 py-3 text-sm font-semibold
        text-red-400 transition hover:bg-red-500/20
        disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingId === show._id
                            ? "Cancelling..."
                            : "Cancel Show"}
                        </button>
                      ) : (
                        <p className="text-center text-sm text-slate-500">
                          Cancellation unavailable
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="border-b border-white/10 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Movie</th>
                      <th className="px-4 py-3 font-medium">
                        Theater / Screen
                      </th>
                      <th className="px-4 py-3 font-medium">Start time</th>
                      <th className="px-4 py-3 font-medium">End time</th>
                      <th className="px-4 py-3 font-medium">Pricing</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {shows.map((show) => (
                      <tr key={show._id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-4 font-medium">
                          {show.movie?.title || "Movie unavailable"}
                        </td>
                        <td className="px-4 py-4">
                          <p>{show.screen?.theater?.name || "—"}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {show.screen?.name || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {formatDateTime(show.startTime)}
                        </td>
                        <td className="px-4 py-4">
                          {formatDateTime(show.endTime)}
                        </td>
                        <td className="px-4 py-4 text-xs leading-6 text-slate-300">
                          <p>Standard: ₹{show.pricing?.standard}</p>
                          <p>Premium: ₹{show.pricing?.premium}</p>
                          <p>Recliner: ₹{show.pricing?.recliner}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              statusStyles[show.status] || ""
                            }`}
                          >
                            {show.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {show.status === "cancelled" ? (
                            <button
                              type="button"
                              disabled
                              className="whitespace-nowrap rounded-lg border
        border-slate-500/30 px-3 py-2 text-xs text-slate-400"
                            >
                              Already Cancelled
                            </button>
                          ) : show.status === "scheduled" &&
                            new Date(show.startTime) > new Date() ? (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(show)}
                              disabled={Boolean(cancellingId)}
                              className="whitespace-nowrap rounded-lg border
        border-red-500/40 px-3 py-2 text-xs font-semibold
        text-red-400 hover:bg-red-500/10
        disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancellingId === show._id
                                ? "Cancelling..."
                                : "Cancel Show"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Unavailable
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                <p className="text-sm text-slate-400">
                  Page {pagination.currentPage} of{" "}
                  {Math.max(1, pagination.totalPages)}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => current - 1)}
                    disabled={page <= 1 || loading}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={page >= pagination.totalPages || loading}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-show-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
          >
            <h2 id="cancel-show-title" className="text-xl font-bold text-white">
              Cancel this show?
            </h2>

            <p className="mt-3 text-sm text-slate-300">
              Are you sure you want to cancel{" "}
              <span className="font-semibold text-white">
                {cancelTarget.movie?.title || "this show"}
              </span>
              ?
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Scheduled for {formatDateTime(cancelTarget.startTime)}
            </p>

            <p className="mt-3 text-sm text-amber-300">
              This action cannot be undone. Existing paid bookings may require
              refunds or customer support.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={Boolean(cancellingId)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                Keep Show
              </button>

              <button
                type="button"
                onClick={handleCancelShow}
                disabled={Boolean(cancellingId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
              >
                {cancellingId ? "Cancelling..." : "Yes, Cancel Show"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
