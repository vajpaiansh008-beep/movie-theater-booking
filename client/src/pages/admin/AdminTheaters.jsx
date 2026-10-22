import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import CreateTheaterForm from "../../components/admin/CreateTheaterForm";
import EditTheaterForm from "../../components/admin/EditTheaterForm";

export default function AdminTheaters() {
  const [theaters, setTheaters] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalTheaters: 0,
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [editingTheater, setEditingTheater] = useState(null);
  const [deletingTheaterId, setDeletingTheaterId] = useState("");

  const [cityInput, setCityInput] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTheaters = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");

      try {
        const params = { page, limit: 10 };

        if (city.trim()) params.city = city.trim();
        if (status) params.status = status;

        const response = await api.get("/admin/theaters", { params });

        setTheaters(response.data.data.theaters);
        setPagination(response.data.data.pagination);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load theaters. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [city, status],
  );

  useEffect(() => {
    fetchTheaters(1);
  }, [fetchTheaters]);

  function handleSearch(event) {
    event.preventDefault();
    setCity(cityInput.trim());
  }

  function clearFilters() {
    setCityInput("");
    setCity("");
    setStatus("");
  }

  function startEditing(theater) {
    setShowCreateForm(false);
    setEditingTheater(theater);
    setActionMessage("");
    setError("");
  }

  async function handleTheaterUpdated() {
    setEditingTheater(null);
    setActionMessage("Theater updated successfully.");
    await fetchTheaters(pagination.currentPage);
  }

  async function handleDeleteTheater(theater) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${theater.name}"?\n\n` +
        "Theater deletion cannot be undone. The request will be rejected if the theater still has screens.",
    );

    if (!confirmed) return;

    setDeletingTheaterId(theater._id);
    setError("");
    setActionMessage("");

    try {
      await api.delete(`/admin/theaters/${theater._id}`);

      setActionMessage(`"${theater.name}" was deleted successfully.`);

      const nextPage =
        theaters.length === 1 && pagination.currentPage > 1
          ? pagination.currentPage - 1
          : pagination.currentPage;

      await fetchTheaters(nextPage);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete theater. Please try again.",
      );
    } finally {
      setDeletingTheaterId("");
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
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Theaters</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage cinema locations and their details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <p className="text-sm text-slate-400">Total matching theaters</p>
              <p className="mt-1 text-2xl font-bold">
                {pagination.totalTheaters}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateForm((previous) => !previous)}
              className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-500"
            >
              {showCreateForm ? "Close Form" : "+ Add Theater"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          {showCreateForm && (
            <CreateTheaterForm
              onCancel={() => setShowCreateForm(false)}
              onSuccess={async () => {
                setShowCreateForm(false);
                setActionMessage("Theater created successfully.");

                setCityInput("");
                setCity("");
                setStatus("");

                // The filter changes trigger a reload if needed.
                // Fetch directly only when already on the default filters.
                if (!city && !status) {
                  await fetchTheaters(1);
                }
              }}
            />
          )}

          <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-3">
            <input
              type="search"
              value={cityInput}
              onChange={(event) => setCityInput(event.target.value)}
              placeholder="Filter by city..."
              aria-label="Filter theaters by city"
              className="min-w-0 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-red-500"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by theater status"
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
          {editingTheater && (
            <EditTheaterForm
              key={editingTheater._id}
              theater={editingTheater}
              onCancel={() => setEditingTheater(null)}
              onSuccess={handleTheaterUpdated}
            />
          )}

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
                onClick={() => fetchTheaters(pagination.currentPage)}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              Loading theaters...
            </div>
          ) : !error && theaters.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-lg font-semibold">No theaters found</h2>
              <p className="mt-2 text-sm text-slate-400">
                Try another city or clear your filters.
              </p>
            </div>
          ) : !error ? (
            <>
              <div className="mt-6 grid gap-4 md:hidden">
                {theaters.map((theater) => (
                  <article
                    key={theater._id}
                    className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">{theater.name}</h2>
                      <StatusBadge status={theater.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      {theater.addressLine}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {theater.city}, {theater.state} — {theater.pincode}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {theater.contactPhone || "No contact phone"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(theater)}
                        disabled={Boolean(deletingTheaterId)}
                        className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Edit Theater
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTheater(theater)}
                        disabled={Boolean(deletingTheaterId)}
                        className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingTheaterId === theater._id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Theater</th>
                      <th className="px-4 py-4">City</th>
                      <th className="px-4 py-4">Pincode</th>
                      <th className="px-4 py-4">Contact</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {theaters.map((theater) => (
                      <tr
                        key={theater._id}
                        className="transition hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold">{theater.name}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {theater.addressLine}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {theater.city}, {theater.state}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {theater.pincode}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {theater.contactPhone || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={theater.status} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(theater)}
                              disabled={Boolean(deletingTheaterId)}
                              className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTheater(theater)}
                              disabled={Boolean(deletingTheaterId)}
                              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingTheaterId === theater._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
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
                    onClick={() => fetchTheaters(pagination.currentPage - 1)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={
                      pagination.currentPage >= pagination.totalPages || loading
                    }
                    onClick={() => fetchTheaters(pagination.currentPage + 1)}
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
