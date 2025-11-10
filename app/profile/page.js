"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import AddAddressModal from "../../components/AddAddressModal";

export default function ProfilePage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", mobile: "", defaultAddress: "" });
  const [addressText, setAddressText] = useState("");
  const [pincode, setPincode] = useState("");
  const [place, setPlace] = useState("");
  const [district, setDistrict] = useState("");
  const [stateNameVal, setStateNameVal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [processingAddrId, setProcessingAddrId] = useState(null);

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
          // populate structured fields if user has addresses
          if (data.addresses && data.addresses.length > 0) {
            // leave structured inputs blank; user can manage existing addresses below
          }
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
      if (!res.ok) {
        alert(data.message || "Update failed");
        return;
      }

      // Profile updated
      alert("✅ Profile updated successfully!");
      localStorage.setItem("kokoru_user", JSON.stringify(data.user));
      setUser(data.user);

      // If user filled structured address fields, add as an address
      if (addressText || pincode) {
        try {
          const addrRes = await fetch(`${API_BASE_URL}/api/users/addresses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: form.name || data.user.name,
              mobile: form.mobile || data.user.mobile,
              address: addressText || form.defaultAddress || "",
              pincode: pincode || "",
              place: place || "",
              district: district || "",
              state: stateNameVal || "",
              label: "Home",
            }),
          });

          const addrData = await addrRes.json();
          if (addrRes.ok) {
            // update local user copy with new addresses if returned
            if (addrData && addrData.addresses) {
              const newUser = { ...data.user, addresses: addrData.addresses };
              localStorage.setItem("kokoru_user", JSON.stringify(newUser));
              setUser(newUser);
            }
            alert("Address saved to your profile.");
            // clear structured fields
            setAddressText("");
            setPincode("");
            setPlace("");
            setDistrict("");
            setStateNameVal("");
          } else {
            console.warn("Address add failed:", addrData);
          }
        } catch (err) {
          console.error("Error adding address:", err);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  // Refresh current user data from server and update state
  const refreshUser = async () => {
    const token = localStorage.getItem("kokoru_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data);
      setForm({ name: data.name || "", mobile: data.mobile || "", defaultAddress: data.defaultAddress || "" });
    } catch (err) {
      console.error("refreshUser failed", err);
    }
  };

  const openAddModal = () => {
    setModalInitial(null);
    setShowModal(true);
  };

  const openEditModal = (addr) => {
    setModalInitial(addr);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setModalInitial(null);
  };

  // Save handler used by AddAddressModal (can be create or update)
  const handleAddressSave = async (addrForm) => {
    const token = localStorage.getItem("kokoru_token");
    if (!token) return alert("Please login first");
    // basic validation
    if (!addrForm.pincode || addrForm.pincode.length !== 6) return alert("Please enter a valid 6-digit pincode");

    try {
      if (modalInitial && modalInitial._id) {
        // update
        setProcessingAddrId(modalInitial._id);
        const res = await fetch(`${API_BASE_URL}/api/users/addresses/${modalInitial._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(addrForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Update failed");
        await refreshUser();
        setShowModal(false);
        setModalInitial(null);
      } else {
        // create
        const res = await fetch(`${API_BASE_URL}/api/users/addresses`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(addrForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Create failed");
        await refreshUser();
        setShowModal(false);
      }
    } catch (err) {
      console.error("Address save failed:", err);
      alert(err.message || "Failed to save address");
    } finally {
      setProcessingAddrId(null);
    }
  };

  const handleAddressDelete = async (addr) => {
    if (!confirm("Delete this address?")) return;
    const token = localStorage.getItem("kokoru_token");
    if (!token) return alert("Please login first");

    // optimistic UI: remove locally then attempt server delete
    const before = user?.addresses || [];
    const filtered = before.filter((a) => String(a._id) !== String(addr._id));
    setUser((u) => ({ ...u, addresses: filtered }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/addresses/${addr._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ addressText: addr.address, pincode: addr.pincode, mobile: addr.mobile }),
      });
      if (res.status === 404) {
        const debug = await res.json().catch(() => ({}));
        console.warn("Delete returned 404", debug);
        // refresh authoritative list
        await refreshUser();
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Delete failed");
      }
      // success -> refresh
      await refreshUser();
    } catch (err) {
      console.error("Delete failed", err);
      alert(err.message || "Failed to delete address");
      // revert optimistic
      setUser((u) => ({ ...u, addresses: before }));
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
            <label className="text-sm font-semibold text-gray-800">Default Address</label>
            <textarea
              rows="2"
              value={form.defaultAddress}
              onChange={(e) => setForm({ ...form, defaultAddress: e.target.value })}
              className="w-full border border-purple-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none text-purple-800"
            />

            <p className="text-sm text-gray-600 mt-2">Or add a structured address:</p>
            <textarea
              rows="2"
              placeholder="Street / Building / Landmark"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              className="w-full border border-purple-200 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none text-purple-800"
            />

            <input
              type="text"
              placeholder="Pincode"
              value={pincode}
              onChange={(e) => {
                const v = e.target.value;
                setPincode(v);
                setPlace("");
                setDistrict("");
                setStateNameVal("");
                if (v && v.length === 6) {
                  fetch(`${API_BASE_URL}/api/pincode/${v}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (data && data.ok) {
                        setPlace(data.places?.[0]?.name || "");
                        setDistrict(data.district || "");
                        setStateNameVal(data.state || "");
                      }
                    })
                    .catch(() => {});
                }
              }}
              className="w-full border border-purple-200 rounded-lg px-3 py-2 mt-2 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800"
            />

            <div className="grid grid-cols-3 gap-2 mt-2">
              <input type="text" placeholder="Place" value={place} readOnly className="border rounded-lg px-3 py-2" />
              <input type="text" placeholder="District" value={district} readOnly className="border rounded-lg px-3 py-2" />
              <input type="text" placeholder="State" value={stateNameVal} readOnly className="border rounded-lg px-3 py-2" />
            </div>
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

        {/* 🧾 Addresses list */}
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-purple-700">Your Addresses</h3>
            <button onClick={openAddModal} className="text-sm px-3 py-1 bg-purple-600 text-white rounded">+ Add</button>
          </div>

          {user.addresses && user.addresses.length > 0 ? (
            <div className="space-y-3">
              {user.addresses.map((addr) => (
                <div key={addr._id} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm font-medium">{addr.label || 'Address'}</div>
                      <div className="text-sm text-gray-700">{addr.address}</div>
                      <div className="text-xs text-gray-500">{addr.place} • {addr.district} • {addr.state} • {addr.pincode}</div>
                      {addr.mobile ? <div className="text-xs text-gray-500">Mobile: {addr.mobile}</div> : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => openEditModal(addr)} className="text-sm text-blue-600">Edit</button>
                      <button onClick={() => handleAddressDelete(addr)} className="text-sm text-red-600">Delete</button>
                      <button
                        onClick={() => {
                          setForm((f) => ({ ...f, defaultAddress: addr.address || '' }));
                          handleSave();
                        }}
                        className="text-sm text-green-600"
                      >
                        Set as default
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No saved addresses yet.</p>
          )}
        </div>

        {/* Address modal */}
        <AddAddressModal open={showModal} onClose={handleModalClose} onSave={handleAddressSave} initialData={modalInitial} />
      </div>
    </main>
  );
}
