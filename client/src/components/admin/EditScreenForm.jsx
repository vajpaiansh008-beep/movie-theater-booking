import { useState } from "react";
import api from "../../lib/api";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-red-500";

export default function EditScreenForm({ screen, onCancel, onSuccess }) {
  const [form, setForm] = useState({
    name: screen.name || "",
    screenType: screen.screenType || "standard",
    totalSeats: String(screen.totalSeats ?? ""),
    status: screen.status || "active",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setServerError("");
  }

  function validate() {
    const nextErrors = {};
    const capacity = Number(form.totalSeats);

    if (!form.name.trim()) {
      nextErrors.name = "Screen name is required.";
    } else if (form.name.trim().length > 100) {
      nextErrors.name = "Maximum 100 characters.";
    }

    if (
      form.totalSeats.trim() === "" ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 1000
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
      await api.patch(`/admin/screens/${screen._id}`, {
        name: form.name.trim(),
        screenType: form.screenType,
        totalSeats: Number(form.totalSeats),
        status: form.status,
      });

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
        responseData?.message || "Unable to update screen. Please try again.",
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
    <section className="mb-6 rounded-xl border border-amber-500/20 bg-slate-900/70 p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Edit Screen</h2>

      <p className="mt-1 text-sm text-slate-400">
        Update the screen details below.
      </p>

      <p className="mt-2 text-sm text-slate-300">
        Theater: {screen.theater?.name || "Current theater"}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-screen-name" className="mb-1 block text-sm">
              Screen name *
            </label>

            <input
              id="edit-screen-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              className={inputClass}
            />

            {fieldError("name")}
          </div>

          <div>
            <label htmlFor="edit-screen-type" className="mb-1 block text-sm">
              Screen type
            </label>

            <select
              id="edit-screen-type"
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
            <label
              htmlFor="edit-screen-capacity"
              className="mb-1 block text-sm"
            >
              Configured seat capacity *
            </label>

            <input
              id="edit-screen-capacity"
              name="totalSeats"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={form.totalSeats}
              onChange={handleChange}
              required
              className={inputClass}
            />

            {fieldError("totalSeats")}

            <p className="mt-1 text-xs text-slate-500">
              This does not automatically create or remove seats.
            </p>
          </div>

          <div>
            <label htmlFor="edit-screen-status" className="mb-1 block text-sm">
              Status
            </label>

            <select
              id="edit-screen-status"
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
            {serverError}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
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
