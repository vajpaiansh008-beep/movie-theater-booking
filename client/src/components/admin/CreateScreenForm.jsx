import { useEffect, useState } from "react";
import api from "../../lib/api";

const initialForm = {
  theaterId: "",
  name: "",
  screenType: "standard",
  totalSeats: "",
  status: "active",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-red-500";

export default function CreateScreenForm({ onCancel, onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [theaters, setTheaters] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loadingTheaters, setLoadingTheaters] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchTheaters() {
      setLoadingTheaters(true);

      try {
        // Fetch active theaters only. The backend limits each page to 50.
        const response = await api.get("/admin/theaters", {
          params: { page: 1, limit: 50, status: "active" },
        });

        if (!cancelled) {
          setTheaters(response.data.data.theaters || []);
        }
      } catch (err) {
        if (!cancelled) {
          setServerError(
            err.response?.data?.message ||
              "Unable to load theaters. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTheaters(false);
        }
      }
    }

    fetchTheaters();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setServerError("");
  }

  function validate() {
    const nextErrors = {};
    const totalSeats = Number(form.totalSeats);

    if (!form.theaterId) {
      nextErrors.theaterId = "Select a theater.";
    }

    if (!form.name.trim()) {
      nextErrors.name = "Screen name is required.";
    } else if (form.name.trim().length > 100) {
      nextErrors.name = "Maximum 100 characters.";
    }

    if (
      form.totalSeats.trim() === "" ||
      !Number.isInteger(totalSeats) ||
      totalSeats < 1 ||
      totalSeats > 1000
    ) {
      nextErrors.totalSeats = "Enter a whole number between 1 and 1000.";
    }

    if (!["standard", "premium", "imax", "4dx"].includes(form.screenType)) {
      nextErrors.screenType = "Choose a valid screen type.";
    }

    if (!["active", "inactive"].includes(form.status)) {
      nextErrors.status = "Choose a valid status.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      await api.post("/admin/screens", {
        theaterId: form.theaterId,
        name: form.name.trim(),
        screenType: form.screenType,
        totalSeats: Number(form.totalSeats),
        status: form.status,
      });

      setForm(initialForm);
      await onSuccess();
    } catch (err) {
      const responseData = err.response?.data;

      if (Array.isArray(responseData?.errors)) {
        const nextErrors = {};

        responseData.errors.forEach((item) => {
          if (item.field) {
            nextErrors[item.field] = item.message;
          }
        });

        setErrors(nextErrors);
      }

      setServerError(
        responseData?.message || "Unable to create screen. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name) {
    return errors[name] ? (
      <p className="mt-1 text-xs text-red-400">{errors[name]}</p>
    ) : null;
  }

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Add Screen</h2>

      <p className="mt-1 text-sm text-slate-400">
        Select an active theater and configure its screen.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="screen-theater" className="mb-1 block text-sm">
              Theater *
            </label>

            <select
              id="screen-theater"
              name="theaterId"
              value={form.theaterId}
              onChange={handleChange}
              required
              disabled={loadingTheaters || theaters.length === 0}
              className={inputClass}
            >
              <option value="">
                {loadingTheaters
                  ? "Loading theaters..."
                  : theaters.length === 0
                    ? "No active theaters available"
                    : "Select a theater"}
              </option>

              {theaters.map((theater) => (
                <option key={theater._id} value={theater._id}>
                  {theater.name} ({theater.city})
                </option>
              ))}
            </select>

            {fieldError("theaterId")}
          </div>

          <div>
            <label htmlFor="screen-name" className="mb-1 block text-sm">
              Screen name *
            </label>

            <input
              id="screen-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              className={inputClass}
              placeholder="e.g. Screen 1"
            />

            {fieldError("name")}
          </div>

          <div>
            <label htmlFor="screen-type" className="mb-1 block text-sm">
              Screen type
            </label>

            <select
              id="screen-type"
              name="screenType"
              value={form.screenType}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="imax">IMAX</option>
              <option value="4dx">4DX</option>
            </select>

            {fieldError("screenType")}
          </div>

          <div>
            <label htmlFor="screen-capacity" className="mb-1 block text-sm">
              Total seat capacity *
            </label>

            <input
              id="screen-capacity"
              name="totalSeats"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={form.totalSeats}
              onChange={handleChange}
              required
              className={inputClass}
              placeholder="e.g. 150"
            />

            {fieldError("totalSeats")}

            <p className="mt-1 text-xs text-slate-500">
              This is the configured capacity, not the generated seat count.
            </p>
          </div>

          <div>
            <label htmlFor="screen-status" className="mb-1 block text-sm">
              Status
            </label>

            <select
              id="screen-status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {fieldError("status")}
          </div>
        </div>

        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            <p>{serverError}</p>

            {!loadingTheaters && theaters.length === 0 && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 font-semibold underline"
              >
                Reload page
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || loadingTheaters || theaters.length === 0}
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Screen"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-white/15 px-5 py-3 text-sm transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
