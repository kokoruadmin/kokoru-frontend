"use client";
import Link from "next/link";

export default function LoginPromptModal({ open, onClose, redirectTo = "/cart" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-gray-800">
        <h3 className="text-lg font-bold text-purple-700 mb-2">Login Required</h3>
        <p className="text-sm text-gray-600 mb-6">
          Please log in to continue with your checkout.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <Link
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
