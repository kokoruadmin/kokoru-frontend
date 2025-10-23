"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { loadRazorpay } from "../../utils/razorpayHelper";
import { getImageUrl } from "../../utils/imageHelper";

export default function CartPage() {
  const { cart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart } =
    useCart();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 🏠 Address Management
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [label, setLabel] = useState("Home");
  const [user, setUser] = useState(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("kokoru_token")
      : null;

  /* =========================================================
     🟣 Load user & addresses
  ========================================================= */
useEffect(() => {
  const token = localStorage.getItem("kokoru_token");
  if (!token) return;

  fetch(`${API_BASE_URL}/api/users/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(async (res) => {
      const text = await res.text();
      if (!text) return [];
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setAddresses(data);

          // 🟣 Auto-select default if found
          const defaultAddr = data.find((a) => a.isDefault);
          if (defaultAddr) setSelectedAddress(defaultAddr.address);
        }
      } catch (err) {
        console.error("❌ Invalid JSON:", err);
      }
    })
    .catch((err) => console.error("Fetch addresses error:", err));
}, []);



useEffect(() => {
  const token = localStorage.getItem("kokoru_token");
  if (!token) return;

  fetch(`${API_BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      setUser(data);
      // ✅ If the user has a default address, preselect it
      if (data?.defaultAddress) {
        setSelectedAddress(data.defaultAddress);
      }
    })
    .catch((err) => console.error("User fetch error:", err));
}, []);



  /* =========================================================
     🟢 Save new address
  ========================================================= */
const handleAddAddress = async () => {
  if (!newAddress.trim()) return alert("Please enter an address");
  if (!token) return alert("Please log in to save your address.");

  const res = await fetch(`${API_BASE_URL}/api/users/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ label, address: newAddress }),
  });

  const data = await res.json();
  if (res.ok) {
    setAddresses(data.addresses || []);
    setNewAddress("");
    setSelectedAddress(newAddress); // ✅ instantly select the new address for checkout
    alert("Address saved successfully 🎉");
  } else {
    alert(data.message || "Failed to save address");
  }
};


  /* =========================================================
     💳 Checkout (with address validation)
  ========================================================= */
  const handleCheckout = async () => {
    if (!selectedAddress) {
      alert("Please select or add a delivery address before checkout.");
      return;
    }

    const res = await loadRazorpay();
    if (!res) return alert("Failed to load Razorpay SDK");

    const orderRes = await fetch(
      `${API_BASE_URL}/api/payment/create-order`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      }
    );

    const order = await orderRes.json();

    const options = {
      key: "rzp_test_RTld4edx9dyo6C",
      amount: order.amount,
      currency: order.currency,
      name: "Kokoru 🌸",
      description: "Order Payment",
      order_id: order.id,
      handler: async function (response) {
        const verifyRes = await fetch(
          `${API_BASE_URL}/api/payment/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              cart,
              address: selectedAddress,
              userEmail: user?.email || "guest",
            }),
          }
        );

        const data = await verifyRes.json();
        if (data.success) {
          clearCart();
          window.location.href = `/payment-success?order_id=${response.razorpay_order_id}&payment_id=${response.razorpay_payment_id}&amount=${
            order.amount / 100
          }`;
        } else {
          alert("Payment verification failed ❌");
        }
      },
      prefill: {
        name: user?.name || "Kokoru Customer",
        email: user?.email || "customer@example.com",
        contact: user?.mobile || "9999999999", // ✅ use actual saved mobile number
      },
      theme: { color: "#9d4edd" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  /* =========================================================
     🛒 Empty Cart View
  ========================================================= */
  if (cart.length === 0)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-purple-50 text-gray-700">
        <Image
          src="/empty-cart.png"
          width={220}
          height={220}
          alt="Empty Cart"
          className="mb-6 opacity-80"
        />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty 🛒</h2>
        <p className="text-gray-500 text-sm mb-6">
          Add something beautiful to your cart!
        </p>
        <Link
          href="/shop"
          className="bg-purple-600 text-white px-6 py-2 rounded-lg shadow hover:bg-purple-700 transition"
        >
          Go Shopping
        </Link>
      </main>
    );

  /* =========================================================
     🧾 Cart Page
  ========================================================= */
  return (
    <main className="min-h-screen bg-purple-50 p-6 text-gray-800">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">Your Cart</h1>

      {/* 🛍 Cart Items */}
      <ul className="space-y-4 mb-8">
        {cart.map((item) => (
          <li
            key={item.key}
            className="bg-white p-4 rounded-2xl shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <Image
                src={getImageUrl(item.imageUrl)}
                alt={item.name}
                width={80}
                height={80}
                className="rounded-lg border object-cover"
              />
              <div>
                <h3 className="font-semibold text-purple-800">{item.name}</h3>
                {item.colorName && (
                  <p className="text-sm text-gray-500">
                    Color: {item.colorName}
                  </p>
                )}
                {item.sizeLabel && (
                  <p className="text-sm text-gray-500">
                    Size: {item.sizeLabel}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  ₹{item.price} × {item.quantity}
                </p>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => decreaseQuantity(item.key)}
                className="w-7 h-7 bg-gray-200 text-purple-700 rounded-full font-bold"
              >
                -
              </button>
              <span className="w-6 text-center">{item.quantity}</span>
              <button
                onClick={() => increaseQuantity(item.key)}
                className="w-7 h-7 bg-purple-600 text-white rounded-full font-bold"
              >
                +
              </button>
            </div>

            {/* Price + Remove */}
            <div className="text-right sm:text-center">
              <p className="font-semibold text-purple-800">
                ₹{item.price * item.quantity}
              </p>
              <button
                onClick={() => removeFromCart(item.key)}
                className="text-xs text-red-600 hover:underline mt-1"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* 🏠 Address Section */}
      <section className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-purple-700 mb-3">
          Delivery Address
        </h2>

        {token ? (
          <>
            {addresses.length > 0 && (
              <div className="mb-4 space-y-2">
                {addresses.map((addr) => (
                  <label
                    key={addr._id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.address}
                      checked={selectedAddress === addr.address}
                      onChange={() => setSelectedAddress(addr.address)}
                    />
                    <span>
                      <strong>{addr.label}</strong>: {addr.address}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Add New Address */}
            <div className="mt-4">
              <select
                className="border rounded-lg px-3 py-2 mb-2"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              >
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>

              <textarea
                placeholder="Enter new address..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />

              <button
                onClick={handleAddAddress}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                Save Address
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-sm">
            Please{" "}
            <Link href="/login" className="text-purple-700 underline">
              log in
            </Link>{" "}
            to save your address.
          </p>
        )}
      </section>

      {/* 💳 Checkout Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xl font-semibold text-purple-800">
          Total: ₹{total}
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleCheckout}
            className="bg-green-600 text-white px-6 py-2 rounded-lg shadow hover:bg-green-700 transition"
          >
            Pay with Razorpay
          </button>

          <button
            onClick={clearCart}
            className="text-sm text-gray-600 underline"
          >
            Clear Cart
          </button>
        </div>
      </div>
    </main>
  );
}
