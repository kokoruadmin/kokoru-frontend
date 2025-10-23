"use client";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState({ orderId: "", paymentId: "", amount: "" });

  useEffect(() => {
    // ✅ Move parameter extraction to client side
    const orderId = searchParams.get("order_id");
    const paymentId = searchParams.get("payment_id");
    const amount = searchParams.get("amount");

    setQuery({ orderId, paymentId, amount });
  }, [searchParams]);

  // Avoid SSR mismatch during Vercel build
  if (!query.orderId && !query.paymentId && !query.amount) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-purple-50 text-gray-800 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
        <h1 className="text-3xl font-bold text-purple-700 mb-4">
          🎉 Payment Successful!
        </h1>
        <p className="text-gray-600 mb-2">Thank you for shopping with Kokoru 🌸</p>

        <div className="text-left mt-4 mb-6 text-sm">
          <p><strong>Order ID:</strong> {query.orderId}</p>
          <p><strong>Payment ID:</strong> {query.paymentId}</p>
          <p><strong>Amount Paid:</strong> ₹{query.amount}</p>
        </div>

        <Link
          href="/shop"
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}
