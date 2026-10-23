import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import CreateScreenForm from "../../components/admin/CreateScreenForm";
import EditScreenForm from "../../components/admin/EditScreenForm";

export default function AdminScreens() {
  const [screens, setScreens] = useState([]);
  const [theaters, setTheaters] = useState([]);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalScreens: 0,
  });

  const [theaterIdInput, setTheaterIdInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [theaterId, setTheaterId] = useState("");
  const [status, setStatus] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [editingScreen, setEditingScreen] = useState(null);
  const [deletingScreenId, setDeletingScreenId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTheaters = useCallback(async () => {
    try {
      // Load theaters for the filter dropdown.
      const response = await api.get("/admin/theaters", {
        params: { page: 1, limit: 50, status: "active" },
      });

      setTheaters(response.data.data.theaters || []);
    } catch {
      // The screen list can still load if this request fails.
      setTheaters([]);
    }
  }, []);

  const fetchScreens = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");

      try {
        const params = { page, limit: 10 };

        if (theaterId) params.theaterId = theaterId;
        if (status) params.status = status;

        const response = await api.get("/admin/screens", { params });

        setScreens(response.data.data.screens || []);
        setPagination(response.data.data.pagination);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load screens. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [theaterId, status],
  );

  useEffect(() => {
    fetchTheaters();
  }, [fetchTheaters]);

  useEffect(() => {
    fetchScreens(1);
  }, [fetchScreens]);

  function handleSearch(event) {
    event.preventDefault();
    setTheaterId(theaterIdInput);
    setStatus(statusInput);
  }

  function clearFilters() {
    setTheaterIdInput("");
    setStatusInput("");
    setTheaterId("");
    setStatus("");
  }

  function startEditing(screen) {
    setShowCreateForm(false);
    setEditingScreen(screen);
    setActionMessage("");
    setError("");
  }

  async function handleScreenUpdated() {
    setEditingScreen(null);
    setActionMessage("Screen updated successfully.");
    await fetchScreens(pagination.currentPage);
  }

  async function handleDeleteScreen(screen) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${screen.name}"?\n\n` +
        "Deletion is permanent. Screens with seats, shows, or booking records cannot be deleted. Deactivate the screen instead if it is in use.",
    );

    if (!confirmed) return;

    setDeletingScreenId(screen._id);
    setError("");
    setActionMessage("");

    try {
      await api.delete(`/admin/screens/${screen._id}`);

      setActionMessage(`"${screen.name}" was deleted successfully.`);

      const nextPage =
        screens.length === 1 && pagination.currentPage > 1
          ? pagination.currentPage - 1
          : pagination.currentPage;

      await fetchScreens(nextPage);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete screen. Please try again.",
      );
    } finally {
      setDeletingScreenId("");
    }
  }

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

          <Link
            to="/admin"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-4 py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              Cinema management
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Screens</h1>
            <p className="mt-2 text-sm text-slate-400">
              View screens, their theater locations, capacity, and status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <p className="text-sm text-slate-400">Total matching screens</p>
              <p className="mt-1 text-2xl font-bold">
                {pagination.totalScreens}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCreateForm((previous) => !previous);
                setActionMessage("");
              }}
              className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-500"
            >
              {showCreateForm ? "Close Form" : "+ Add Screen"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          {showCreateForm && (
            <CreateScreenForm
              onCancel={() => setShowCreateForm(false)}
              onSuccess={async () => {
                setShowCreateForm(false);
                setActionMessage("Screen created successfully.");

                setTheaterIdInput("");
                setStatusInput("");
                setTheaterId("");
                setStatus("");

                await fetchScreens(1);
              }}
            />
          )}
          {editingScreen && (
            <EditScreenForm
              key={editingScreen._id}
              screen={editingScreen}
              onCancel={() => setEditingScreen(null)}
              onSuccess={handleScreenUpdated}
            />
          )}
          <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-3">
            <select
              value={theaterIdInput}
              onChange={(event) => setTheaterIdInput(event.target.value)}
              aria-label="Filter by theater"
              className="min-w-0 rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-red-500"
            >
              <option value="">All theaters</option>
              {theaters.map((theater) => (
                <option key={theater._id} value={theater._id}>
                  {theater.name} ({theater.city})
                </option>
              ))}
            </select>

            <select
              value={statusInput}
              onChange={(event) => setStatusInput(event.target.value)}
              aria-label="Filter by screen status"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-red-500"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-500"
            >
              Apply filters
            </button>
          </form>
          {actionMessage && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
            >
              {actionMessage}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-slate-300 underline underline-offset-4 hover:text-white"
            >
              Clear filters
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => fetchScreens(pagination.currentPage)}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              Loading screens...
            </div>
          ) : !error && screens.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-lg font-semibold">No screens found</h2>
              <p className="mt-2 text-sm text-slate-400">
                Try another filter. Screens will appear here once created.
              </p>
            </div>
          ) : !error ? (
            <>
              {/* Mobile screen cards */}
              <div className="mt-6 grid gap-4 md:hidden">
                {screens.map((screen) => (
                  <article
                    key={screen._id}
                    className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">{screen.name}</h2>
                      <StatusBadge status={screen.status} />
                    </div>

                    <p className="mt-2 text-sm text-slate-300">
                      {screen.theater?.name || "Unknown theater"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {screen.theater
                        ? `${screen.theater.city}, ${screen.theater.state}`
                        : "Location unavailable"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white/10 px-3 py-1.5">
                        {screen.screenType}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1.5">
                        Capacity: {screen.totalSeats}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(screen)}
                        disabled={Boolean(deletingScreenId)}
                        className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteScreen(screen)}
                        disabled={Boolean(deletingScreenId)}
                        className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingScreenId === screen._id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                      <Link
                        to={`/admin/seat-layout?screenId=${screen._id}`}
                        className="inline-flex rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                      >
                        Manage Seat Layout
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop screen table */}
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Screen</th>
                      <th className="px-4 py-4">Theater</th>
                      <th className="px-4 py-4">City</th>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4">Capacity</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {screens.map((screen) => (
                      <tr
                        key={screen._id}
                        className="transition hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-4 font-semibold">
                          {screen.name}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {screen.theater?.name || "Unknown theater"}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {screen.theater
                            ? `${screen.theater.city}, ${screen.theater.state}`
                            : "Unavailable"}
                        </td>
                        <td className="px-4 py-4 capitalize text-slate-300">
                          {screen.screenType}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {screen.totalSeats}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={screen.status} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(screen)}
                              disabled={Boolean(deletingScreenId)}
                              className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteScreen(screen)}
                              disabled={Boolean(deletingScreenId)}
                              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingScreenId === screen._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                            <Link
                              to={`/admin/seat-layout?screenId=${screen._id}`}
                              className="inline-flex rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                            >
                              Manage Seat Layout
                            </Link>
                          </div>
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
                    disabled={pagination.currentPage <= 1 || loading}
                    onClick={() => fetchScreens(pagination.currentPage - 1)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      pagination.currentPage >= pagination.totalPages ||
                      loading ||
                      pagination.totalPages === 0
                    }
                    onClick={() => fetchScreens(pagination.currentPage + 1)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-500/10 text-emerald-400",
    inactive: "bg-slate-500/10 text-slate-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-white/10 text-slate-300"
      }`}
    >
      {status}
    </span>
  );
}
