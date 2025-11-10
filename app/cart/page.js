"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { loadRazorpay } from "../../utils/razorpayHelper";
import { getImageUrl } from "../../utils/imageHelper";
import { Loader2, Tag, Trash2, Plus, Minus, Home } from "lucide-react";
import AddAddressModal from "../../components/AddAddressModal";

export default function CartPage() {
  const { cart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart } = useCart();
  const [isClient, setIsClient] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [label, setLabel] = useState("Home");
  const [newAddress, setNewAddress] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newStateVal, setNewStateVal] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [user, setUser] = useState(null);

  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const subtotal = cart.reduce((sum, item) => sum + (item.ourPrice || item.price) * item.quantity, 0);
  const totalPayable = Math.max(subtotal - discountAmount, 0);

  /* --------------------------- INIT --------------------------- */
  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    fetch(`${API_BASE_URL}/api/coupons/active`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAvailableCoupons(data.coupons || []);
      })
      .catch(() => {});
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    const token = localStorage.getItem("kokoru_token");
    if (!token) return;

    fetch(`${API_BASE_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setUser)
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/users/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isClient]);

  // helper to refresh addresses from server
  const refreshAddresses = async () => {
    const token = localStorage.getItem("kokoru_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/addresses`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error('Failed to refresh addresses', err);
      return null;
    }
  };

  // Auto-select the first address when addresses load if none selected yet.
  useEffect(() => {
    if (!isClient) return;
    if (addresses && addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, isClient, selectedAddress]);

  /* --------------------------- COUPON --------------------------- */
  const handleApplyCoupon = () => {
    const coupon = availableCoupons.find((c) => c.code.toLowerCase() === couponCode.toLowerCase());
    if (!coupon) return alert("Invalid coupon code");
    if (subtotal < coupon.minOrder) return alert(`Minimum order ₹${coupon.minOrder} required`);
    if (new Date(coupon.expiryDate) < new Date()) return alert("Coupon expired");

    let discount = 0;
    if (coupon.discountType === "flat") discount = coupon.discountValue;
    else if (coupon.discountType === "percent") {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
    }

    setAppliedCoupon(coupon);
    setDiscountAmount(Math.min(discount, subtotal));
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setDiscountAmount(0);
  };

  /* --------------------------- ADDRESS --------------------------- */
  const handleAddAddress = async () => {
    if (!newAddress.trim() || !newPincode.trim() || !newMobile.trim())
      return alert("Please enter address, pincode and mobile");
    // require pincode to be 6 digits
    if (!/^\d{6}$/.test(String(newPincode).trim())) return alert("Please enter a valid 6-digit pincode");
    const token = localStorage.getItem("kokoru_token");
    if (!token) return alert("Please log in first");

    const payload = {
      label,
      address: {
        address: newAddress,
        pincode: newPincode,
        mobile: newMobile,
        place: newPlace,
        district: newDistrict,
        state: newStateVal,
      },
    };

    const res = await fetch(`${API_BASE_URL}/api/users/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok) {
      setAddresses(data.addresses || []);
      setNewAddress("");
      setNewPincode("");
        setNewPlace("");
        setNewDistrict("");
        setNewStateVal("");
      setNewMobile("");
      alert("Address added successfully 🎉");
    } else alert(data.message || "Failed to save address");
  };

  // autofill place/district/state for inline add by pincode
  const handleNewPincodeChange = async (val) => {
    setNewPincode(val);
    setNewPlace("");
    setNewDistrict("");
    setNewStateVal("");
    if (!/^[0-9]{6}$/.test(val)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/pincode/${val}`);
      const data = await res.json();
      if (data.ok) {
        setNewPlace(data.places?.[0]?.name || "");
        setNewDistrict(data.district || "");
        setNewStateVal(data.state || "");
      } else {
        // invalid pincode handling
        console.warn('Pincode lookup failed', data);
      }
    } catch (err) {
      console.error('Failed to fetch pincode', err);
    }
  };

  /* --------------------------- CHECKOUT --------------------------- */
  // proceedToPayment contains the payment creation + Razorpay flow
  const proceedToPayment = async () => {
    setLoading(true);
    try {
      const res = await loadRazorpay();
      if (!res) throw new Error("Failed to load Razorpay");

      const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalPayable }),
      });
      const order = await orderRes.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: "Kokoru 🌸",
        description: "Order Payment",
        order_id: order.id,
        handler: async function (response) {
          try {
            // show full-page loading while verifying payment to avoid flashing cart UI
            setProcessingPayment(true);

            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                cart,
                coupon: appliedCoupon,
                discountAmount,
                totalAfterDiscount: totalPayable,
                address: typeof selectedAddress === 'object' ? selectedAddress : { label, address: selectedAddress, pincode: "", mobile: user?.mobile },
                userEmail: user?.email,
                customerName: user?.name,
                contact: user?.mobile,
              }),
            });

            const verifyJson = await verifyRes.json();
            // clear cart locally but keep overlay until redirect
            clearCart();
            const orderId = verifyJson?.orderId || '';
            window.location.href = `/payment-success?order_id=${orderId}&payment_id=${response.razorpay_payment_id}&amount=${totalPayable}`;
          } catch (err) {
            console.error('Payment verify failed', err);
            // ensure overlay remains visible while redirecting to failure
            setProcessingPayment(true);
            window.location.href = `/payment-failure`;
          }
        },
        modal: {
          ondismiss: function () {
            // user closed the payment modal without completing
            setProcessingPayment(true);
            window.location.href = `/payment-failure`;
          },
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.mobile },
        theme: { color: "#8b5cf6" },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Main checkout entry: validate address pincode before proceeding
  const handleCheckout = async () => {
    const token = localStorage.getItem("kokoru_token");
    if (!token) return alert("Please log in to continue and receive email confirmation");

    // Defensive fallback: if no address is actively selected but addresses exist, pick the first one.
    // Use a local addrToUse for flow, and also update UI state so radio selection reflects it.
    let addrToUse = selectedAddress;
    if (!addrToUse && addresses && addresses.length > 0) {
      addrToUse = addresses[0];
      setSelectedAddress(addrToUse);
    }
    if (!addrToUse) return alert("Please select a delivery address");

    // If address is an object, check pincode field; if it's the default (string), addrToUse.address may be string
    const addrObj = typeof addrToUse === "object" ? addrToUse : { address: addrToUse };
    // call server-side validation for authoritative check
    try {
      const payload = addrObj._id === "default" ? { address: { address: addrObj.address, pincode: addrObj.pincode || "", mobile: user?.mobile } } : { addressId: addrObj._id };
      const res = await fetch(`${API_BASE_URL}/api/users/addresses/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        // open modal to edit/add missing fields
        setModalInitialData(
          addrObj._id === "default"
            ? { address: addrObj.address, label: addrObj.label || "Home", pincode: addrObj.pincode || "", mobile: user?.mobile }
            : { ...addrObj }
        );
        setCheckoutPending(true);
        const missing = (data && data.missingFields) ? data.missingFields.join(', ') : '';
        alert(`Please complete the following fields before payment: ${missing}`);
        setShowAddressModal(true);
        return;
      }

      // all good, go to payment
      await proceedToPayment();
    } catch (err) {
      console.error('Validation check failed', err);
      alert('Failed to validate address. Please try again.');
    }
  };

  /* --------------------------- UI --------------------------- */
  if (!isClient) return null;

  if (cart.length === 0)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-purple-50 text-gray-700">
        <Image src="/empty-cart.png" width={200} height={200} alt="Empty Cart" />
        <h2 className="text-lg font-semibold mt-4">Your cart is empty 🛒</h2>
        <Link href="/shop" className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg">
          Go Shopping
        </Link>
      </main>
    );

  return (
    <main className="min-h-screen bg-purple-50 px-4 py-6 text-gray-800">
      <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center sm:text-left">Your Cart</h1>

      {/* Full-page overlay shown while payment is being processed to avoid flashing cart before redirect */}
      {processingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-purple-600" size={40} />
            <div className="text-lg font-medium text-gray-800">Processing payment…</div>
            <div className="text-sm text-gray-500 mt-1">Please wait — you will be redirected shortly.</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 🛍 Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div key={item.key} className="bg-white p-4 rounded-xl shadow flex items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <Image src={getImageUrl(item.imageUrl)} width={80} height={80} alt={item.name} className="rounded-lg border" />
                <div>
                  <h3 className="font-semibold text-purple-800">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    {item.colorName} {item.sizeLabel && `| ${item.sizeLabel}`}
                  </p>
                  <p className="text-gray-600 text-sm">
                    ₹{item.ourPrice || item.price} × {item.quantity}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => decreaseQuantity(item.key)} className="p-1 rounded-full bg-gray-200"><Minus size={16} /></button>
                <span>{item.quantity}</span>
                <button onClick={() => increaseQuantity(item.key)} className="p-1 rounded-full bg-purple-600 text-white"><Plus size={16} /></button>
              </div>

              <div className="text-right">
                <p className="font-semibold text-purple-700">
                  ₹{((item.ourPrice || item.price) * item.quantity).toFixed(2)}
                </p>
                <button onClick={() => removeFromCart(item.key)} className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 🧾 Summary + Address */}
        <div className="bg-white rounded-xl shadow-lg p-6 h-fit space-y-5">
          <h2 className="text-xl font-semibold text-purple-700">Order Summary</h2>

          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-600">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-semibold text-purple-800">
              <span>Total Payable</span>
              <span>₹{totalPayable.toFixed(2)}</span>
            </div>
          </div>

          {/* 🎟 Coupon Box */}
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 border px-3 py-2 rounded-lg text-sm"
              />
              {!appliedCoupon ? (
                <button onClick={handleApplyCoupon} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-1">
                  <Tag size={16} /> Apply
                </button>
              ) : (
                <button onClick={handleRemoveCoupon} className="bg-gray-300 px-4 py-2 rounded-lg">Remove</button>
              )}
            </div>
          </div>

          {/* 🏠 Address Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <Home size={16} /> Delivery Address
            </h3>
            {addresses.length > 0 && (
              <div className="space-y-1 mb-3">
                {addresses.map((addr, idx) => {
                  const idStr = String(addr && (addr._id ?? addr.address ?? ''));
                  return (
                    <label key={`${idStr}-${idx}`} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="address"
                        value={`${idStr}-${idx}`}
                        // support legacy addresses which may be plain strings or objects without _id
                        checked={
                          String(selectedAddress?._id ?? selectedAddress?.address ?? selectedAddress ?? '') === idStr
                        }
                        onChange={() => setSelectedAddress(addr)}
                      />
                    <span className="flex-1"><strong>{addr.label}</strong>: {addr.address}{addr.pincode ? `, ${addr.pincode}` : ''}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setModalInitialData(addr); setShowAddressModal(true); setSelectedAddress(addr); setCheckoutPending(false); }}
                        className="text-sm text-blue-600 hover:underline mr-2"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          const token = localStorage.getItem("kokoru_token");
                          if (!token) return alert("Please log in to delete addresses");
                          if (!confirm("Delete this address?")) return;
                          const prev = addresses;
                          try {
                            // allow legacy addresses without _id: use address text as identifier
                            const idOrKey = String(addr && (addr._id ?? addr.address ?? ''));
                            setDeletingId(idOrKey);
                            // optimistic removal using either _id or address text
                            setAddresses((cur) => cur.filter((a) => String(a && (a._id ?? a.address ?? '')) !== idOrKey));

                            const res = await fetch(`${API_BASE_URL}/api/users/addresses/${encodeURIComponent(idOrKey)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ addressText: addr.address, pincode: addr.pincode, mobile: addr.mobile }) });
                            let data = {};
                            try { data = await res.json(); } catch(e) { /* ignore parse errors */ }
                            if (!res.ok) {
                              // If server tells us which ids are available, try to resolve a matching address and retry once
                              console.warn('Delete failed', { status: res.status, body: data });
                              if (res.status === 404 && data?.available && data.available.length > 0) {
                                // refresh addresses from server to get authoritative ids
                                const refreshed = await refreshAddresses();
                                const list = Array.isArray(refreshed) ? refreshed : refreshed?.addresses || [];
                                // try to find a matching address by address text + pincode
                                const match = list.find((a) => a && a.address && a.pincode && addr.address && (String(a.address).trim() === String(addr.address).trim()) && String(a.pincode).trim() === String(addr.pincode || '').trim());
                                if (match && match._id) {
                                  // retry deletion with the correct id once
                                  const retryId = String(match._id);
                                  setDeletingId(retryId);
                                  const retryRes = await fetch(`${API_BASE_URL}/api/users/addresses/${encodeURIComponent(retryId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                  try { data = await retryRes.json(); } catch(e) {}
                                  if (!retryRes.ok) {
                                    setAddresses(prev);
                                    return alert(data?.message || 'Failed to delete address after resolving id');
                                  }
                                  // final refresh
                                  await refreshAddresses();
                                  if (selectedAddress && String(selectedAddress._id ?? selectedAddress.address ?? selectedAddress ?? '') === retryId) setSelectedAddress(null);
                                  setDeletingId(null);
                                  return;
                                }
                              }

                              // revert optimistic removal and show message
                              setAddresses(prev);
                              const msg = data?.message || (data?.available ? `Available: ${JSON.stringify(data.available)}` : 'Failed to delete address');
                              return alert(msg);
                            }

                            // refresh authoritative list
                            const refreshed = await refreshAddresses();
                            // if the deleted address was selected, clear selection
                            if (selectedAddress && String(selectedAddress._id ?? selectedAddress.address ?? selectedAddress ?? '') === idOrKey) setSelectedAddress(null);
                          } catch (err) {
                            console.error(err);
                            setAddresses(prev);
                            alert('Failed to delete address');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        {deletingId === String(addr._id ?? addr.address ?? '') ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </label>
                  );
                })}
              </div>
            )}

            <select className="border rounded-lg px-3 py-2 mb-2 text-sm" value={label} onChange={(e) => setLabel(e.target.value)}>
              <option>Home</option>
              <option>Work</option>
              <option>Other</option>
            </select>

            <textarea
              placeholder="Enter new address..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />

            <input
              placeholder="Pincode"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-2"
              value={newPincode}
              onChange={(e) => handleNewPincodeChange(e.target.value)}
            />

            {/* autofilled place/district/state for the inline add form */}
            {newPlace || newDistrict || newStateVal ? (
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                {newPlace ? <div><strong>Place:</strong> {newPlace}</div> : null}
                {newDistrict ? <div><strong>District:</strong> {newDistrict}</div> : null}
                {newStateVal ? <div><strong>State:</strong> {newStateVal}</div> : null}
              </div>
            ) : null}

            <input
              placeholder="Mobile number"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-2"
              value={newMobile}
              onChange={(e) => setNewMobile(e.target.value)}
            />

            <button onClick={handleAddAddress} className="mt-2 w-full bg-purple-100 text-purple-700 py-2 rounded-lg hover:bg-purple-200 text-sm">
              + Add New Address
            </button>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            {loading ? <Loader2 className="animate-spin inline-block mr-2" size={18} /> : null}
            Pay ₹{totalPayable.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Address Modal for editing/adding pincode before checkout */}
      <AddAddressModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        initialData={modalInitialData}
        onSave={async (form) => {
          // if selectedAddress is an existing address (not 'default') update it, otherwise create a new address
          const token = localStorage.getItem("kokoru_token");
          if (!token) return alert("Please log in to save address");

          try {
            // Determine whether this save is an update (editing an existing address)
            // Prefer modalInitialData (the address we opened for editing), fallback to selectedAddress.
            const editTarget = modalInitialData && modalInitialData._id ? modalInitialData : selectedAddress;
              if (editTarget && editTarget._id && editTarget._id !== "default") {
              // update existing (has an _id)
              const res = await fetch(`${API_BASE_URL}/api/users/addresses/${editTarget._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ label: form.label, address: form }),
              });
              const data = await res.json();
              if (!res.ok) return alert(data.message || "Failed to update address");
              // refresh authoritative list from server
              const refreshed = await refreshAddresses();
              const list = Array.isArray(refreshed) ? refreshed : refreshed?.addresses || [];
              if (list && list.length >= 0) {
                const updated = list.find((a) => String(a._id) === String(editTarget._id));
                // fallback: try to find by matching address text
                const byAddr = list.find((a) => a.address === form.address && a.pincode === form.pincode);
                setSelectedAddress(updated || byAddr || null);
              }
              } else if (editTarget && !editTarget._id && editTarget.address) {
              // legacy address without _id: attempt to PATCH using address text as identifier
              const idKey = editTarget.address;
              const res = await fetch(`${API_BASE_URL}/api/users/addresses/${encodeURIComponent(idKey)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ label: form.label, address: form }),
              });
              const data = await res.json();
              if (!res.ok) return alert(data.message || "Failed to update address");
              const refreshed = await refreshAddresses();
              const list = Array.isArray(refreshed) ? refreshed : refreshed?.addresses || [];
              if (list && list.length >= 0) {
                // after conversion the updated entry should either have an _id or match by text
                const updated = list.find((a) => a.address === form.address && a.pincode === form.pincode) || list.find((a) => String(a._id) === String(idKey));
                setSelectedAddress(updated || null);
              }
            } else {
              // create new address (covers default and new cases)
              const res = await fetch(`${API_BASE_URL}/api/users/addresses`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ label: form.label, address: form }),
              });
              const data = await res.json();
              if (!res.ok) return alert(data.message || "Failed to add address");
              // refresh authoritative list
              const refreshed = await refreshAddresses();
              const list = Array.isArray(refreshed) ? refreshed : refreshed?.addresses || [];
              if (list && list.length > 0) {
                const found = list.find((a) => a.pincode === form.pincode && a.address === form.address);
                setSelectedAddress(found || list[list.length - 1]);
              }
            }

            setShowAddressModal(false);
            // after successful save, continue to payment if checkout was pending
            if (checkoutPending) {
              setCheckoutPending(false);
              await proceedToPayment();
            }
          } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save address");
          }
        }}
      />
    </main>
  );
}
