"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";

export default function PaymentFailure() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Payment Failed</h1>
        <p className="text-gray-600 mb-4">We couldn't complete your payment. No charges were made.</p>
        <div className="text-sm text-left mb-4">
          <p>If you closed the payment popup or your payment was interrupted, please try again.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/cart" className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Return to Cart</Link>
          <Link href="/shop" className="px-4 py-2 bg-gray-200 rounded-lg">Continue Shopping</Link>
        </div>
        <p className="text-xs text-gray-500 mt-4">If the problem persists, contact support.</p>
      </div>
    </main>
  );
}
