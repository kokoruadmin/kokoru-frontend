"use client";
import { useEffect, useState } from "react";
import { Plus, Copy, Edit, Trash2, RefreshCcw } from "lucide-react";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "flat",
    discountValue: 0,
    maxDiscount: 0,
    minOrder: 0,
    expiryDate: "",
    description: "",
    isActive: true,
    firstOrderOnly: false,
    giftToUser: "",
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const adminToken =
  localStorage.getItem("kokoru_admin_token") ||
  localStorage.getItem("admin_token");

  // Fetch all coupons
  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/coupons`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setCoupons(data || []);
    } catch (err) {
      console.error("Failed to load coupons", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCoupons(); }, []);

  // Submit new / edited coupon
// Submit new / edited coupon
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const method = editCoupon ? "PUT" : "POST";
    const url = editCoupon
      ? `${API_BASE}/api/coupons/${editCoupon._id}`
      : `${API_BASE}/api/coupons`;

    // ✅ Sanitize & normalize values before sending
const payload = {
  ...formData,
  discountValue: Number(formData.discountValue) || 0,
  maxDiscount: Number(formData.maxDiscount) || 0,
  minOrder: Number(formData.minOrder) || 0,
  isActive: Boolean(formData.isActive),
  firstOrderOnly: Boolean(formData.firstOrderOnly),
  expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
  giftToUser: formData.giftToUser?.trim() ? formData.giftToUser.trim() : null, // ✅ fix here
};

    console.log("📦 Sending coupon payload:", payload);

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Coupon save failed:", data);
      throw new Error(data.message || "Failed to save coupon");
    }

    alert(editCoupon ? "✅ Coupon updated successfully!" : "🎉 Coupon created successfully!");
    setShowForm(false);
    setEditCoupon(null);
    loadCoupons();
  } catch (err) {
    console.error("Error:", err);
    alert(err.message || "Something went wrong while saving the coupon");
  } finally {
    setLoading(false);
  }
};


  const handleDelete = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`${API_BASE}/api/coupons/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    loadCoupons();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Coupon code ${code} copied!`);
  };

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-purple-700">Coupons</h1>
        <button
          onClick={() => {
            setFormData({
              code: "",
              discountType: "flat",
              discountValue: 0,
              maxDiscount: 0,
              minOrder: 0,
              expiryDate: "",
              description: "",
              isActive: true,
              firstOrderOnly: false,
              giftToUser: "",
            });
            setShowForm(true);
            setEditCoupon(null);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={18} /> New Coupon
        </button>
      </div>

{showForm && (
  <form
    onSubmit={handleSubmit}
    className="bg-white shadow rounded-lg p-6 mb-6 space-y-5 border border-purple-100"
  >
    <h2 className="text-xl font-semibold text-purple-700 mb-4">
      {editCoupon ? "✏️ Edit Coupon" : "🎁 Create New Coupon"}
    </h2>

    {/* 🧾 Coupon Basic Details */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Coupon Code
        </label>
<input
  type="text"
  placeholder="User ID or Email"
  value={formData.giftToUser ?? ""}  // ✅ prevent null issue
  onChange={(e) =>
    setFormData({ ...formData, giftToUser: e.target.value })
  }
  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300"
/>

      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Discount Type
        </label>
        <select
          value={formData.discountType}
          onChange={(e) =>
            setFormData({ ...formData, discountType: e.target.value })
          }
          className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300 bg-white"
        >
          <option value="flat">Flat ₹</option>
          <option value="percent">Percentage %</option>
        </select>
      </div>
    </div>

    {/* 💰 Discount Details */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Discount Value
        </label>
<input
  type="number"
  step="1"
  min="0"
  value={formData.discountValue}
  onChange={(e) => {
    const value = e.target.value === "" ? "" : Math.max(0, +e.target.value);
    setFormData({ ...formData, discountValue: value });
  }}
  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300"
/>

      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Discount (₹)
        </label>
<input
  type="number"
  step="1"
  min="0"
  value={formData.maxDiscount}
  onChange={(e) => {
    const value = e.target.value === "" ? "" : Math.max(0, +e.target.value);
    setFormData({ ...formData, maxDiscount: value });
  }}
  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300"
/>

      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Order (₹)
        </label>
<input
  type="number"
  step="50"
  min="0"
  value={formData.minOrder}
  onChange={(e) => {
    const value = e.target.value === "" ? "" : Math.max(0, +e.target.value);
    setFormData({ ...formData, minOrder: value });
  }}
  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300"
/>

      </div>
    </div>

    {/* 📅 Expiry & Gift */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expiry Date
        </label>
        <input
          type="date"
          value={formData.expiryDate}
          onChange={(e) =>
            setFormData({ ...formData, expiryDate: e.target.value })
          }
          className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gift to Specific User (optional)
        </label>
        <input
          type="text"
          placeholder="User ID or Email"
          value={formData.giftToUser}
          onChange={(e) =>
            setFormData({ ...formData, giftToUser: e.target.value })
          }
          className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300"
        />
      </div>
    </div>

    {/* 📝 Description */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Description
      </label>
      <textarea
        placeholder="Describe this coupon (optional)"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-300"
        rows={3}
      />
    </div>

    {/* ✅ Toggles */}
    <div className="flex items-center gap-6 mt-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) =>
            setFormData({ ...formData, isActive: e.target.checked })
          }
        />
        Active
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={formData.firstOrderOnly}
          onChange={(e) =>
            setFormData({ ...formData, firstOrderOnly: e.target.checked })
          }
        />
        First Order Only
      </label>
    </div>

    {/* Buttons */}
    <div className="flex justify-end gap-3 mt-4">
      <button
        type="button"
        onClick={() => {
          setShowForm(false);
          setEditCoupon(null);
        }}
        className="border border-gray-300 px-4 py-2 rounded text-sm"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="bg-purple-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-purple-700 transition"
      >
        {editCoupon ? "Update Coupon" : "Create Coupon"}
      </button>
    </div>
  </form>
)}


      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-purple-100 text-gray-700">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Value</th>
              <th className="p-2 text-left">Min Order</th>
              <th className="p-2 text-left">Expiry</th>
              <th className="p-2 text-left">Active</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center p-4">Loading...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan="7" className="text-center p-4">No coupons</td></tr>
            ) : (
              coupons.map((c) => (
                <tr key={c._id} className="border-t">
                  <td className="p-2 font-semibold">{c.code}</td>
                  <td className="p-2">{c.discountType}</td>
                  <td className="p-2">
                    {c.discountType === "flat"
                      ? `₹${c.discountValue}`
                      : `${c.discountValue}% (max ₹${c.maxDiscount})`}
                  </td>
                  <td className="p-2">₹{c.minOrder}</td>
                  <td className="p-2">{new Date(c.expiryDate).toLocaleDateString()}</td>
                  <td className="p-2">{c.isActive ? "✅" : "❌"}</td>
                  <td className="p-2 flex gap-2">
                    <button onClick={() => copyCode(c.code)} title="Copy"><Copy size={16} /></button>
                    <button onClick={() => { setEditCoupon(c); setFormData(c); setShowForm(true); }} title="Edit"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(c._id)} title="Delete"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
