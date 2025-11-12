"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import AddAddressModal from "../../components/AddAddressModal";
import { normalizeAddress } from "../../utils/addressHelper";

export default function ProfilePage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", mobile: "" });
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
          // split name into first and last
          const full = String(data.name || "").trim();
          const parts = full.split(/\s+/).filter(Boolean);
          const first = parts.length ? parts[0] : "";
          const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
          setForm({ firstName: first, lastName: last, mobile: data.mobile || "" });
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
      // compose name from first + last
      const composedName = `${String(form.firstName || "").trim()}${form.lastName ? ' ' + String(form.lastName).trim() : ''}`.trim();
      const payload = { name: composedName, mobile: form.mobile };

      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
      const full = String(data.name || "").trim();
      const parts = full.split(/\s+/).filter(Boolean);
      const first = parts.length ? parts[0] : "";
      const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
      setForm({ firstName: first, lastName: last, mobile: data.mobile || "" });
    } catch (err) {
      console.error("refreshUser failed", err);
    }
  };

  // Keep the editable form in sync with server user data.
  useEffect(() => {
    try {
      if (!user) return;
      const full = String(user.name || "").trim();
      const parts = full.split(/\s+/).filter(Boolean);
      const first = parts.length ? parts[0] : "";
      const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
      setForm((f) => ({ ...f, firstName: first, lastName: last, mobile: user.mobile || "" }));
    } catch (e) {
      console.warn('Failed to sync user -> form', e);
    }
  }, [user]);

  const openAddModal = () => {
    setModalInitial(null);
    setShowModal(true);
  };

  const openEditModal = (addr) => {
    // If editing the special default address or a legacy string, normalize it
    try {
      if (!addr) {
        setModalInitial(null);
        setShowModal(true);
        return;
      }

      if (String(addr._id || '') === 'default' || typeof addr === 'string') {
        const source = (addr && addr.address) || (typeof addr === 'string' ? addr : user?.defaultAddress || '');
        const n = normalizeAddress(source);
        // keep the special _id so save handler knows this is the default entry
        setModalInitial({ ...n, _id: 'default', label: addr.label || 'Default' });
      } else {
        setModalInitial(addr);
      }
      setShowModal(true);
    } catch (e) {
      console.warn('openEditModal normalization failed', e);
      setModalInitial(addr);
      setShowModal(true);
    }
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

        // Special-case the 'default' entry: update user's defaultAddress string instead of addresses collection
        if (String(modalInitial._id) === 'default') {
          try {
            const defStr = `${addrForm.address || ''}${addrForm.pincode ? `\nPincode: ${addrForm.pincode}` : ''}`.trim();
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ defaultAddress: defStr }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update default address');
            await refreshUser();
            setShowModal(false);
            setModalInitial(null);
          } catch (err) {
            throw err;
          }
        } else {
          const payload = {
            label: addrForm.label || "Home",
            address: {
              name: addrForm.name || "",
              address: addrForm.address || "",
              pincode: addrForm.pincode || "",
              place: addrForm.place || "",
              district: addrForm.district || "",
              state: addrForm.state || "",
              mobile: addrForm.mobile || "",
            },
          };

          const res = await fetch(`${API_BASE_URL}/api/users/addresses/${modalInitial._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Update failed");
          await refreshUser();
          setShowModal(false);
          setModalInitial(null);
        }
      } else {
        // create
        const payload = {
          label: addrForm.label || "Home",
          address: {
            name: addrForm.name || "",
            address: addrForm.address || "",
            pincode: addrForm.pincode || "",
            place: addrForm.place || "",
            district: addrForm.district || "",
            state: addrForm.state || "",
            mobile: addrForm.mobile || "",
          },
        };

        const res = await fetch(`${API_BASE_URL}/api/users/addresses`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Create failed");
        await refreshUser();
        setShowModal(false);
          // Make the newly added address the defaultAddress for this profile
          try {
            const defAddr = (addrForm.address || "").toString();
            if (defAddr && defAddr.trim()) {
              await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ defaultAddress: defAddr }),
              });
              await refreshUser();
            }
          } catch (e) {
            console.warn('Failed to set default address after modal save', e);
          }
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-semibold text-gray-800">First name</label>
              <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full form-input mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-800">Surname</label>
              <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full form-input mt-1" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800">
              Mobile Number
            </label>
            <input
              type="text"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full form-input mt-1"
            />
          </div>

          <div>
            <button onClick={handleSave} className="w-full mt-2 bg-purple-600 text-white py-2 rounded">
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>

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
                        onClick={async () => {
                          // mark processing for this address
                          setProcessingAddrId(addr._id);
                          try {
                            const token = localStorage.getItem("kokoru_token");
                            if (!token) return alert("Please login first");

                            const res = await fetch(`${API_BASE_URL}/api/users/addresses/${addr._id}/set-default`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                            });

                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.message || "Failed to set default address");

                            // refresh local user and show success
                            await refreshUser();
                            alert("Default address updated.");
                          } catch (err) {
                            console.error("Set default failed", err);
                            alert(err.message || "Failed to set default address");
                          } finally {
                            setProcessingAddrId(null);
                          }
                        }}
                        className="text-sm text-green-600"
                      >
                        {processingAddrId === addr._id ? "Processing..." : "Set as default"}
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
