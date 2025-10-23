"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", mobile: "", defaultAddress: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Safe fallback for production
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://kokoru-backend.onrender.com";

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const token = localStorage.getItem("kokoru_token");
    if (!token) {
      alert("Please log in to view your profile.");
      window.location.href = "/login";
      return;
    }

    // ✅ Correct endpoint now -> /api/users/me
    fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const text = await res.text();
        if (!text) return {};
        try {
          return JSON.parse(text);
        } catch (err) {
          console.error("Invalid JSON:", text);
          return {};
        }
      })
      .then((data) => {
        if (data && data.email) {
          setUser(data);
          setForm({
            name: data.name || "",
            mobile: data.mobile || "",
            defaultAddress: data.defaultAddress || "",
          });
        } else {
          throw new Error("Invalid user data");
        }
      })
      .catch((err) => {
        console.error("Profile load error:", err);
        alert("Session expired. Please log in again.");
        localStorage.removeItem("kokoru_token");
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, [isClient]);

  const handleSave = async () => {
    if (!isClient) return;

    const token = localStorage.getItem("kokoru_token");
    if (!token) return alert("Please login first");

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Profile updated successfully!");
        localStorage.setItem("kokoru_user", JSON.stringify(data.user));
        setUser(data.user);
      } else {
        alert(data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isClient)
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </main>
    );

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-600">
        Loading profile...
      </main>
    );

  if (!user)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-gray-600">
        <p>Unable to load profile. Please log in again.</p>
        <button
          onClick={() => (window.location.href = "/login")}
          className="mt-4 bg-purple-700 text-white px-4 py-2 rounded"
        >
          Go to Login
        </button>
      </main>
    );

  return (
    <main className="min-h-screen bg-purple-50 p-6 text-purple-800">
      <div className="max-w-lg mx-auto bg-white shadow-lg rounded-2xl p-8 border border-purple-100">
        {/* 👤 Header */}
        <div className="text-center border-b pb-4 mb-4">
          <div className="w-16 h-16 bg-purple-100 text-purple-700 flex items-center justify-center rounded-full mx-auto text-2xl font-bold shadow-inner">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <h1 className="text-2xl font-bold text-purple-700 mt-3">
            {user.name || "User"}
          </h1>
          <p className="text-base text-gray-800">{user.email}</p>
        </div>

        {/* ✏️ Editable Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-800">
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-purple-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none text-purple-800"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800">
              Mobile Number
            </label>
            <input
              type="text"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full border border-purple-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800">
              Default Address
            </label>
            <textarea
              rows="3"
              value={form.defaultAddress}
              onChange={(e) =>
                setForm({ ...form, defaultAddress: e.target.value })
              }
              className="w-full border border-purple-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none text-purple-800"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800">
              Email (read-only)
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full border border-purple-200 rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-800 cursor-not-allowed"
            />
          </div>
        </div>

        {/* 💾 Save Button */}
        <div className="mt-6 text-center">
          <button
            disabled={saving}
            onClick={handleSave}
            className={`px-6 py-2 rounded-lg text-white font-medium transition ${
              saving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-700 hover:bg-purple-800 shadow-md"
            }`}
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
