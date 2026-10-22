import { useState } from "react";
import api from "../../lib/api";

export default function EditTheaterForm({ theater, onCancel, onSuccess }) {
  const [form, setForm] = useState({
    name: theater.name || "",
    addressLine: theater.addressLine || "",
    city: theater.city || "",
    state: theater.state || "",
    pincode: theater.pincode || "",
    contactPhone: theater.contactPhone || "",
    amenities: (theater.amenities || []).join(", "),
    status: theater.status || "active",
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

    if (!form.name.trim()) {
      nextErrors.name = "Theater name is required.";
    } else if (form.name.trim().length > 150) {
      nextErrors.name = "Maximum 150 characters.";
    }

    if (!form.addressLine.trim()) {
      nextErrors.addressLine = "Address is required.";
    } else if (form.addressLine.trim().length > 300) {
      nextErrors.addressLine = "Maximum 300 characters.";
    }

    if (!form.city.trim()) {
      nextErrors.city = "City is required.";
    } else if (form.city.trim().length > 100) {
      nextErrors.city = "Maximum 100 characters.";
    }

    if (!form.state.trim()) {
      nextErrors.state = "State is required.";
    } else if (form.state.trim().length > 100) {
      nextErrors.state = "Maximum 100 characters.";
    }

    if (!/^[0-9]{6}$/.test(form.pincode)) {
      nextErrors.pincode = "Enter a valid 6-digit PIN code.";
    }

    if (form.contactPhone.trim().length > 20) {
      nextErrors.contactPhone = "Maximum 20 characters.";
    }

    const amenities = form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (amenities.length > 30) {
      nextErrors.amenities = "You can add up to 30 amenities.";
    } else if (amenities.some((item) => item.length > 60)) {
      nextErrors.amenities = "Each amenity must be 60 characters or fewer.";
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

    const payload = {
      name: form.name.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode,
      contactPhone: form.contactPhone.trim(),
      amenities: form.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      status: form.status,
    };

    setSubmitting(true);

    try {
      await api.patch(`/admin/theaters/${theater._id}`, payload);
      onSuccess();
    } catch (err) {
      const responseData = err.response?.data;

      if (Array.isArray(responseData?.errors)) {
        const nextErrors = {};

        responseData.errors.forEach((item) => {
          if (item.field) nextErrors[item.field] = item.message;
        });

        setErrors(nextErrors);
        setServerError(
          responseData.message || "Please correct the highlighted fields.",
        );
      } else {
        setServerError(
          responseData?.message ||
            "Unable to update theater. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-red-500";

  function fieldError(name) {
    return errors[name] ? (
      <p className="mt-1 text-xs text-red-400">{errors[name]}</p>
    ) : null;
  }

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Edit Theater</h2>
      <p className="mt-1 text-sm text-slate-400">
        Update the details for {theater.name}.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-theater-name" className="mb-1 block text-sm">
              Theater name *
            </label>
            <input
              id="edit-theater-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={150}
              required
              className={inputClass}
            />
            {fieldError("name")}
          </div>

          <div>
            <label htmlFor="edit-theater-city" className="mb-1 block text-sm">
              City *
            </label>
            <input
              id="edit-theater-city"
              name="city"
              value={form.city}
              onChange={handleChange}
              maxLength={100}
              required
              className={inputClass}
            />
            {fieldError("city")}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="edit-theater-address"
              className="mb-1 block text-sm"
            >
              Address *
            </label>
            <input
              id="edit-theater-address"
              name="addressLine"
              value={form.addressLine}
              onChange={handleChange}
              maxLength={300}
              required
              className={inputClass}
            />
            {fieldError("addressLine")}
          </div>

          <div>
            <label htmlFor="edit-theater-state" className="mb-1 block text-sm">
              State *
            </label>
            <input
              id="edit-theater-state"
              name="state"
              value={form.state}
              onChange={handleChange}
              maxLength={100}
              required
              className={inputClass}
            />
            {fieldError("state")}
          </div>

          <div>
            <label
              htmlFor="edit-theater-pincode"
              className="mb-1 block text-sm"
            >
              PIN code *
            </label>
            <input
              id="edit-theater-pincode"
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={6}
              required
              className={inputClass}
            />
            {fieldError("pincode")}
          </div>

          <div>
            <label htmlFor="edit-theater-phone" className="mb-1 block text-sm">
              Contact phone
            </label>
            <input
              id="edit-theater-phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              maxLength={20}
              className={inputClass}
              placeholder="Optional"
            />
            {fieldError("contactPhone")}
          </div>

          <div>
            <label htmlFor="edit-theater-status" className="mb-1 block text-sm">
              Status
            </label>
            <select
              id="edit-theater-status"
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

          <div className="sm:col-span-2">
            <label
              htmlFor="edit-theater-amenities"
              className="mb-1 block text-sm"
            >
              Amenities
            </label>
            <input
              id="edit-theater-amenities"
              name="amenities"
              value={form.amenities}
              onChange={handleChange}
              className={inputClass}
              placeholder="Parking, Food court, Wheelchair access"
            />
            <p className="mt-1 text-xs text-slate-500">
              Separate amenities with commas. Maximum 30 entries.
            </p>
            {fieldError("amenities")}
          </div>
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {serverError}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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
