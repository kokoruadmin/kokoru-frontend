"use client";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { normalizeAddress } from "../utils/addressHelper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const AddressForm = forwardRef(function AddressForm({ initial = null, onSave, submitLabel = "Save", className = "", disabled = false, hideButtons = false }, ref) {
  const n = normalizeAddress(initial || {});
  const [form, setForm] = useState({
    firstName: n.name ? String(n.name).split(' ')[0] : "",
    lastName: n.name ? String(n.name).split(' ').slice(1).join(' ') : "",
    email: n.email || "",
    label: n.label || "Home",
    address: n.address || "",
    landmark: n.landmark || "",
    pincode: n.pincode || "",
    place: n.place || "",
    district: n.district || "",
    state: n.state || "",
    mobile: n.mobile || "",
    alternateMobile: n.alternateMobile || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const nn = normalizeAddress(initial || {});
    setForm({
      firstName: nn.name ? String(nn.name).split(' ')[0] : "",
      lastName: nn.name ? String(nn.name).split(' ').slice(1).join(' ') : "",
      email: nn.email || "",
      label: nn.label || "Home",
      address: nn.address || "",
      landmark: nn.landmark || "",
      pincode: nn.pincode || "",
      place: nn.place || "",
      district: nn.district || "",
      state: nn.state || "",
      mobile: nn.mobile || "",
      alternateMobile: nn.alternateMobile || "",
    });
  }, [initial]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const lookupPincode = async (pin) => {
    if (!pin || pin.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/pincode/${pin}`);
      const data = await res.json();
      if (data && data.ok) {
        setForm((f) => ({ ...f, place: data.places?.[0]?.name || "", district: data.district || "", state: data.state || "", pincode: pin }));
      } else {
        setError("Pincode not found");
      }
    } catch (err) {
      console.error("Pincode lookup failed", err);
      setError("Failed to fetch pincode data");
    } finally {
      setLoading(false);
    }
  };

  const handlePincodeChange = (val) => {
    setForm((f) => ({ ...f, pincode: val }));
    if (/^[0-9]{6}$/.test(val)) lookupPincode(val);
  };

  // submit returns a Promise and performs validation. It can be called via ref or via form submit.
  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    // require first and last name, mobile and pincode
    if (!form.firstName || !form.lastName) {
      setError("Please provide first name and surname");
      return Promise.reject(new Error("Please provide first name and surname"));
    }
    if (!form.address || !form.pincode || !form.mobile) {
      setError("Please fill address, pincode and mobile");
      return Promise.reject(new Error("Please fill address, pincode and mobile"));
    }
    if (!/^[0-9]{6}$/.test(String(form.pincode).trim())) {
      setError("Pincode must be 6 digits");
      return Promise.reject(new Error("Pincode must be 6 digits"));
    }
    if (!/^[0-9]{10}$/.test(String(form.mobile).replace(/\D/g, '')) ) {
      setError("Mobile must be 10 digits");
      return Promise.reject(new Error("Mobile must be 10 digits"));
    }
    if (form.alternateMobile && !/^[0-9]{10}$/.test(String(form.alternateMobile).replace(/\D/g, ''))) {
      setError("Alternate mobile must be 10 digits if provided");
      return Promise.reject(new Error("Alternate mobile must be 10 digits if provided"));
    }

    const payload = {
      ...form,
      name: `${form.firstName.trim()}${form.lastName ? ' ' + form.lastName.trim() : ''}`.trim(),
    };

    if (onSave) {
      try {
        setLoading(true);
        const res = await onSave(payload);
        // allow onSave to return a promise/result
        return res;
      } catch (err) {
        setError(err?.message || "Save failed");
        return Promise.reject(err || new Error("Save failed"));
      } finally {
        setLoading(false);
      }
    }

    return Promise.resolve(payload);
  };

  useImperativeHandle(ref, () => ({ submit }));

  return (
    <form onSubmit={submit} className={className}>
      <div className="grid grid-cols-2 gap-2">
        <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First name" className="w-full form-input mb-2" required />
        <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Surname" className="w-full form-input mb-2" required />
      </div>
      <input name="email" value={form.email} onChange={handleChange} placeholder="Email (optional)" className="w-full form-input mb-2" />
      <select name="label" value={form.label} onChange={handleChange} className="w-full form-input mb-2">
        <option>Home</option>
        <option>Work</option>
        <option>Other</option>
      </select>

  <textarea name="address" value={form.address} onChange={handleChange} placeholder="Street / Building / Address" rows={3} className="w-full form-input mb-2" />
  <input name="landmark" value={form.landmark} onChange={handleChange} placeholder="Landmark (optional)" className="w-full form-input mb-2" />

      <input name="pincode" value={form.pincode} onChange={(e) => handlePincodeChange(e.target.value)} placeholder="Pincode" className="w-full form-input mb-2" />

      {form.place || form.district || form.state ? (
        <div className="text-sm text-gray-600 mb-2">
          {form.place ? <div><strong>Place:</strong> {form.place}</div> : null}
          {form.district ? <div><strong>District:</strong> {form.district}</div> : null}
          {form.state ? <div><strong>State:</strong> {form.state}</div> : null}
        </div>
      ) : null}

  <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="Mobile number" className="w-full form-input mb-2" />
  <input name="alternateMobile" value={form.alternateMobile} onChange={handleChange} placeholder="Alternate mobile (optional)" className="w-full form-input mb-2" />

      {error ? <div className="text-xs text-red-600 mb-2">{error}</div> : null}

      {!hideButtons ? (
        <div className="flex gap-2">
          <button disabled={disabled || loading} type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md">
            {loading ? "Saving..." : submitLabel}
          </button>
        </div>
      ) : null}
    </form>
  );
});

export default AddressForm;
