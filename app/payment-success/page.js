"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentSuccess() {
  const [isClient, setIsClient] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("");

  // ✅ Make sure URL parsing happens only on client
  useEffect(() => {
    setIsClient(true);
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get("order_id") || "");
    setPaymentId(params.get("payment_id") || "");
    setAmount(params.get("amount") || "");
  }, []);

  if (!isClient)
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </main>
    );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-purple-50 text-gray-800 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
        <h1 className="text-3xl font-bold text-purple-700 mb-4">
          🎉 Payment Successful!
        </h1>
        <p className="text-gray-600 mb-2">Thank you for shopping with Kokoru 🌸</p>

        <div className="text-left mt-4 mb-6 text-sm">
          {orderId && <p><strong>Order ID:</strong> {orderId}</p>}
          {paymentId && <p><strong>Payment ID:</strong> {paymentId}</p>}
          {amount && <p><strong>Amount Paid:</strong> ₹{amount}</p>}
        </div>

        <Link
          href="/shop"
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}
