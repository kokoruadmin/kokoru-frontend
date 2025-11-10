"use client";
import { useState, useEffect } from "react";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function AddAddressModal({ open, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({
    name: "",
    label: "Home",
    address: "",
    pincode: "",
    place: "",
    district: "",
    state: "",
    mobile: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Initialize form when opening for edit
  useEffect(() => {
    if (initialData) {
      setForm((f) => ({
        ...f,
        name: initialData.name || "",
        label: initialData.label || "Home",
        address: initialData.address || "",
        pincode: initialData.pincode || "",
        place: initialData.place || "",
        district: initialData.district || "",
        state: initialData.state || "",
        mobile: initialData.mobile || "",
      }));
    }
    // also reset when modal is opened without initialData
    if (!initialData && open) {
      setForm({
        name: "",
        label: "Home",
        address: "",
        pincode: "",
        place: "",
        district: "",
        state: "",
        mobile: "",
      });
      setError("");
    }
  }, [initialData, open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePincode = async (pin) => {
    if (pin.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/pincode/${pin}`);
      const data = await res.json();
      if (data.ok) {
        setForm((f) => ({
          ...f,
          pincode: pin,
          place: data.places?.[0]?.name || "",
          district: data.district || "",
          state: data.state || "",
        }));
      } else {
        setError("Invalid or unknown pincode");
      }
    } catch (err) {
      console.error("Pincode fetch failed:", err);
      setError("Failed to fetch pincode data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address || !form.pincode) {
      setError("Please fill all required fields");
      return;
    }
    // Allow onSave to be async and show loading state while parent handles save
    try {
      setLoading(true);
      const res = onSave(form);
      if (res && typeof res.then === "function") {
        await res;
      }
    } catch (err) {
      console.error("Save failed:", err);
      setError(err?.message || "Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-gray-800 space-y-3"
      >
        <h3 className="text-lg font-semibold text-purple-700">Add New Address</h3>

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full Name"
          className="w-full border rounded-lg px-3 py-2"
        />
        <select
          name="label"
          value={form.label}
          onChange={handleChange}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option>Home</option>
          <option>Work</option>
          <option>Other</option>
        </select>

        <textarea
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Street / Building / Landmark"
          rows={3}
          className="w-full border rounded-lg px-3 py-2"
        />

        <input
          name="pincode"
          value={form.pincode}
          onChange={(e) => {
            handleChange(e);
            handlePincode(e.target.value);
          }}
          placeholder="Pincode"
          className="w-full border rounded-lg px-3 py-2"
        />
        {loading && <p className="text-xs text-gray-500">Fetching area details…</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="grid grid-cols-3 gap-2">
          <input
            name="place"
            value={form.place}
            onChange={handleChange}
            placeholder="Place"
            className="border rounded-lg px-3 py-2"
          />
          <input
            name="district"
            value={form.district}
            onChange={handleChange}
            placeholder="District"
            className="border rounded-lg px-3 py-2"
          />
          <input
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="State"
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <input
          name="mobile"
          value={form.mobile}
          onChange={handleChange}
          placeholder="Mobile"
          className="w-full border rounded-lg px-3 py-2"
        />

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white rounded-full"/> : null}
            <span>{loading ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
