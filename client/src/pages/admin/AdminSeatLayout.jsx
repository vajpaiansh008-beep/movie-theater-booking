import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../lib/api";

const categoryStyles = {
  standard: "border-slate-500/50 bg-slate-700/60 text-slate-200",
  premium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  recliner: "border-purple-500/40 bg-purple-500/10 text-purple-300",
};

const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-400",
  inactive: "bg-slate-500/10 text-slate-400",
};

const createEmptyRow = () => ({
  rowLabel: "",
  startSeatNumber: "1",
  seatCount: "10",
  category: "standard",
});

export default function AdminSeatLayout() {
  const [searchParams] = useSearchParams();
  const screenId = searchParams.get("screenId");

  const [deletingSeats, setDeletingSeats] = useState(false);

  const [screen, setScreen] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rowConfigs, setRowConfigs] = useState([
    {
      rowLabel: "A",
      startSeatNumber: "1",
      seatCount: "10",
      category: "standard",
    },
  ]);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchSeatLayout = useCallback(async () => {
    if (!screenId) {
      setScreen(null);
      setSeats([]);
      setError("Select a screen from Screen Management first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/admin/seats", {
        params: { screenId },
      });

      setScreen(response.data.data.screen);
      setSeats(response.data.data.seats || []);
    } catch (err) {
      setScreen(null);
      setSeats([]);
      setError(
        err.response?.data?.message ||
          "Unable to load the seat layout. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [screenId]);

  useEffect(() => {
    fetchSeatLayout();
  }, [fetchSeatLayout]);

  const rows = useMemo(() => {
    const grouped = new Map();

    for (const seat of seats) {
      if (!grouped.has(seat.rowLabel)) {
        grouped.set(seat.rowLabel, []);
      }

      grouped.get(seat.rowLabel).push(seat);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([rowLabel, rowSeats]) => ({
        rowLabel,
        seats: rowSeats.sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [seats]);

  const activeSeats = seats.filter((seat) => seat.status === "active").length;
  const inactiveSeats = seats.length - activeSeats;
  const remainingCapacity = Math.max(
    0,
    (screen?.totalSeats || 0) - seats.length,
  );

  const generatedSeats = useMemo(() => {
    const result = [];

    for (const row of rowConfigs) {
      const rowLabel = row.rowLabel.trim().toUpperCase();
      const start = Number(row.startSeatNumber);
      const count = Number(row.seatCount);

      if (
        !/^[A-Z]{1,3}$/.test(rowLabel) ||
        !Number.isInteger(start) ||
        !Number.isInteger(count) ||
        start < 1 ||
        count < 1 ||
        start + count - 1 > 1000
      ) {
        continue;
      }

      for (let number = start; number < start + count; number += 1) {
        result.push({
          rowLabel,
          seatNumber: number,
          seatLabel: `${rowLabel}${number}`,
          category: row.category,
        });
      }
    }

    return result;
  }, [rowConfigs]);

  const updateRow = (index, field, value) => {
    setRowConfigs((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
    setFormError("");
    setSuccessMessage("");
  };

  const addRow = () => {
    setRowConfigs((current) => [...current, createEmptyRow()]);
    setFormError("");
    setSuccessMessage("");
  };

  const removeRow = (index) => {
    setRowConfigs((current) => current.filter((_, i) => i !== index));
    setFormError("");
    setSuccessMessage("");
  };

  const handleGenerateSeats = async (event) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!screen?._id || !screenId) {
      setFormError("A valid screen must be selected first.");
      return;
    }

    if (screen.status !== "active") {
      setFormError(
        "This screen is inactive. Activate it in Screen Management before generating seats.",
      );
      return;
    }

    if (rowConfigs.length === 0) {
      setFormError("Add at least one row before generating seats.");
      return;
    }

    const normalizedRows = rowConfigs.map((row) => ({
      rowLabel: row.rowLabel.trim().toUpperCase(),
      start: Number(row.startSeatNumber),
      count: Number(row.seatCount),
      category: row.category,
    }));

    for (let index = 0; index < normalizedRows.length; index += 1) {
      const row = normalizedRows[index];

      if (!/^[A-Z]{1,3}$/.test(row.rowLabel)) {
        setFormError(
          `Row ${index + 1}: use 1–3 letters for the row label, such as A, B, or AA.`,
        );
        return;
      }

      if (!Number.isInteger(row.start) || row.start < 1 || row.start > 1000) {
        setFormError(
          `Row ${row.rowLabel}: the starting seat number must be between 1 and 1000.`,
        );
        return;
      }

      if (
        !Number.isInteger(row.count) ||
        row.count < 1 ||
        row.count > 1000 ||
        row.start + row.count - 1 > 1000
      ) {
        setFormError(
          `Row ${row.rowLabel}: enter a valid seat count. Seat numbers cannot exceed 1000.`,
        );
        return;
      }

      if (!["standard", "premium", "recliner"].includes(row.category)) {
        setFormError(`Row ${row.rowLabel}: select a valid seat category.`);
        return;
      }
    }

    const rowLabels = normalizedRows.map((row) => row.rowLabel);

    if (new Set(rowLabels).size !== rowLabels.length) {
      setFormError(
        "Each row label must be unique in this generation request. Combine seats belonging to the same row into one row entry.",
      );
      return;
    }

    const payloadSeats = [];

    for (const row of normalizedRows) {
      for (
        let number = row.start;
        number < row.start + row.count;
        number += 1
      ) {
        payloadSeats.push({
          rowLabel: row.rowLabel,
          seatNumber: number,
          category: row.category,
        });
      }
    }

    if (payloadSeats.length === 0) {
      setFormError("Configure at least one valid seat.");
      return;
    }

    if (payloadSeats.length > 1000) {
      setFormError("You can generate a maximum of 1000 seats per request.");
      return;
    }

    if (payloadSeats.length > remainingCapacity) {
      setFormError(
        `You are trying to add ${payloadSeats.length} seats, but this screen has capacity for only ${remainingCapacity} more.`,
      );
      return;
    }

    const existingSeatKeys = new Set(
      seats.map((seat) => `${seat.rowLabel}-${seat.seatNumber}`),
    );

    const duplicateSeats = payloadSeats.filter((seat) =>
      existingSeatKeys.has(`${seat.rowLabel}-${seat.seatNumber}`),
    );

    if (duplicateSeats.length > 0) {
      setFormError(
        `The layout already contains ${duplicateSeats.length} of these seat positions. Change the row labels or seat numbers to avoid duplicates.`,
      );
      return;
    }

    setGenerating(true);

    try {
      const response = await api.post("/admin/seats/bulk", {
        screenId,
        seats: payloadSeats,
      });

      const createdCount = response.data?.data?.count ?? payloadSeats.length;

      setSuccessMessage(
        `Successfully generated ${createdCount} seats for ${screen.name}.`,
      );
      setRowConfigs([createEmptyRow()]);
      await fetchSeatLayout();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to generate seats. Please check your configuration and try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAllSeats = async () => {
    if (!screenId || seats.length === 0 || deletingSeats) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete all ${seats.length} seats from "${screen.name}"?\n\nThis action cannot be undone. Seats linked to shows or bookings will be protected by the server.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingSeats(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const response = await api.delete("/admin/seats/bulk", {
        data: { screenId },
      });

      const deletedCount = response.data?.data?.deletedCount ?? 0;

      setSuccessMessage(
        `Successfully deleted ${deletedCount} seats from ${screen.name}. You can now configure a new layout.`,
      );

      await fetchSeatLayout();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to delete seats. Please try again.",
      );
    } finally {
      setDeletingSeats(false);
    }
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

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/screens"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              Back to screens
            </Link>

            <Link
              to="/admin"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-4 py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              Cinema management
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Seat Layout</h1>

            <p className="mt-2 text-sm text-slate-400">
              Configure physical seats and review the layout for this screen.
            </p>
          </div>

          {screen && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <p className="text-sm text-slate-400">Selected screen</p>
              <p className="mt-1 text-lg font-semibold">{screen.name}</p>
            </div>
          )}
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            <p>{error}</p>

            {screenId && (
              <button
                type="button"
                onClick={fetchSeatLayout}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            Loading seat layout...
          </div>
        ) : !error && screen ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Configured capacity"
                value={screen.totalSeats}
              />
              <SummaryCard label="Generated seats" value={seats.length} />
              <SummaryCard label="Active seats" value={activeSeats} />
              <SummaryCard label="Inactive seats" value={inactiveSeats} />
            </section>

            {/* Bulk Seat Generation */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Bulk Seat Generation
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    Configure a row label, starting seat number, number of
                    seats, and category. Seats are added to the existing layout;
                    existing seats are never overwritten.
                  </p>
                </div>

                <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-300">
                  {remainingCapacity} capacity remaining
                </span>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {formError}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
                >
                  {successMessage}
                </div>
              )}

              {screen.status !== "active" && (
                <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                  This screen is inactive. Activate it in Screen Management
                  before generating seats.
                </p>
              )}

              {remainingCapacity === 0 && (
                <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                  This screen has reached its configured capacity. Increase the
                  screen capacity in Screen Management if more seats are
                  required.
                </p>
              )}

              <form onSubmit={handleGenerateSeats} className="mt-6">
                <div className="space-y-4">
                  {rowConfigs.map((row, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-semibold">
                          Row configuration {index + 1}
                        </h3>

                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          disabled={generating}
                          className="text-sm text-red-400 hover:text-red-300 disabled:opacity-40"
                        >
                          Remove row
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                          <span className="mb-2 block text-sm text-slate-300">
                            Row label
                          </span>
                          <input
                            type="text"
                            value={row.rowLabel}
                            onChange={(event) =>
                              updateRow(
                                index,
                                "rowLabel",
                                event.target.value.toUpperCase(),
                              )
                            }
                            placeholder="e.g. A"
                            maxLength={3}
                            required
                            disabled={generating}
                            className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 outline-none focus:border-red-500"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm text-slate-300">
                            Starting seat number
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="1"
                            value={row.startSeatNumber}
                            onChange={(event) =>
                              updateRow(
                                index,
                                "startSeatNumber",
                                event.target.value,
                              )
                            }
                            required
                            disabled={generating}
                            className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 outline-none focus:border-red-500"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm text-slate-300">
                            Number of seats
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="1"
                            value={row.seatCount}
                            onChange={(event) =>
                              updateRow(index, "seatCount", event.target.value)
                            }
                            required
                            disabled={generating}
                            className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 outline-none focus:border-red-500"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm text-slate-300">
                            Seat category
                          </span>
                          <select
                            value={row.category}
                            onChange={(event) =>
                              updateRow(index, "category", event.target.value)
                            }
                            disabled={generating}
                            className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 outline-none focus:border-red-500"
                          >
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="recliner">Recliner</option>
                          </select>
                        </label>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Preview:{" "}
                        {row.rowLabel.trim()
                          ? `${row.rowLabel.trim().toUpperCase()}${row.startSeatNumber}–${row.rowLabel.trim().toUpperCase()}${
                              Number(row.startSeatNumber) +
                              Number(row.seatCount) -
                              1
                            }`
                          : "Enter a row label"}{" "}
                        · {row.seatCount || 0} seats
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <button
                      type="button"
                      onClick={addRow}
                      disabled={generating || rowConfigs.length >= 26}
                      className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + Add row
                    </button>

                    <p className="mt-2 text-xs text-slate-500">
                      {rowConfigs.length}/26 row configurations
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-400">
                      Seats in this request
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {generatedSeats.length}
                    </p>
                  </div>
                </div>

                {generatedSeats.length > remainingCapacity && (
                  <p className="mt-4 text-sm text-amber-300">
                    The configured rows exceed this screen&apos;s remaining
                    capacity.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    generating ||
                    screen.status !== "active" ||
                    remainingCapacity === 0 ||
                    generatedSeats.length === 0 ||
                    generatedSeats.length > remainingCapacity
                  }
                  className="mt-5 w-full rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {generating ? "Generating seats..." : "Generate seats"}
                </button>
              </form>
            </section>

            {/* Existing Seat Layout */}
            {seats.length === 0 ? (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-16 text-center">
                <h2 className="text-lg font-semibold">
                  No seats configured yet
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Configure your rows above and generate seats to create this
                  screen&apos;s physical layout.
                </p>
              </section>
            ) : (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{screen.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {seats.length} configured seat records
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAllSeats}
                      disabled={
                        deletingSeats || generating || seats.length === 0
                      }
                      className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingSeats ? "Deleting seats..." : "Delete All Seats"}
                    </button>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        statusStyles[screen.status] ||
                        "bg-white/10 text-slate-300"
                      }`}
                    >
                      Screen {screen.status}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      statusStyles[screen.status] ||
                      "bg-white/10 text-slate-300"
                    }`}
                  >
                    Screen {screen.status}
                  </span>
                </div>
                {/* Screen / Front */}
                <div className="mx-auto mb-8 w-full max-w-5xl rounded-xl border border-white/10 bg-slate-900/70 px-4 py-5 text-center">
                  <div className="mx-auto h-1 w-2/3 max-w-3xl rounded-full bg-red-500/70" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Screen / Front
                  </p>
                </div>
                
                {/* Centered Seat Rows */}
                <div className="mx-auto w-full max-w-6xl space-y-5">
                  {rows.map((row) => (
                    <div
                      key={row.rowLabel}
                      className="flex w-full items-start gap-3"
                    >
                      {/* Fixed row label */}
                      <span className="w-8 shrink-0 pt-3 text-right text-sm font-semibold text-slate-400">
                        {row.rowLabel}
                      </span>

                      {/* Keep original seat sizes; scroll only when necessary */}
                      <div className="min-w-0 flex-1 overflow-x-auto pb-2">
                        <div className="flex w-max min-w-full flex-nowrap justify-center gap-2">
                          {row.seats.map((seat) => (
                            <div
                              key={seat._id}
                              title={`${seat.seatLabel} · ${seat.category} · ${seat.status}`}
                              className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-semibold ${
                                categoryStyles[seat.category] ||
                                categoryStyles.standard
                              } ${
                                seat.status === "inactive" ? "opacity-40" : ""
                              }`}
                            >
                              {seat.seatNumber}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 border-t border-white/10 pt-5">
                  <h3 className="text-sm font-semibold">Seat legend</h3>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
                    <LegendItem
                      label="Standard"
                      className={categoryStyles.standard}
                    />
                    <LegendItem
                      label="Premium"
                      className={categoryStyles.premium}
                    />
                    <LegendItem
                      label="Recliner"
                      className={categoryStyles.recliner}
                    />
                    <LegendItem
                      label="Inactive"
                      className="border-white/10 bg-slate-800 opacity-50"
                    />
                  </div>
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function LegendItem({ label, className }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${className}`} />
      {label}
    </span>
  );
}
