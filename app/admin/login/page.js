"use client";

import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "kokoru_super_admin_2025";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (secret.trim() !== ADMIN_SECRET) {
      alert("❌ Invalid admin secret key!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      if (!data.user.isAdmin) {
        alert("🚫 Access denied: Not an admin account");
        return;
      }

      localStorage.setItem("kokoru_token", data.token);
      localStorage.setItem("kokoru_user", JSON.stringify(data.user));
      alert("✅ Welcome Admin!");
      window.location.href = "/admin";
    } catch (err) {
      console.error("Admin login error:", err);
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-white to-purple-50">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-2xl p-10 rounded-3xl w-full max-w-md border border-purple-200"
      >
        <div className="text-center mb-6">
          <img src="/kokoru-logo.png" alt="Kokoru Logo" className="w-16 mx-auto mb-3" />
          <h1 className="text-3xl font-extrabold text-purple-800 tracking-wide">
            👑 Kokoru Admin
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Secure admin access panel
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-purple-800 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-purple-200 text-purple-900 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              placeholder="admin@kokoru.in"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-purple-800 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-purple-200 text-purple-900 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-purple-800 mb-1">
              Secret Admin Key
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              className="w-full border border-purple-200 text-purple-900 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              placeholder="Enter secret key"
            />
            <p className="text-xs text-gray-500 mt-1 italic">
              Required for extra security 🔐
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 mt-4 rounded-lg text-white font-semibold tracking-wide transition-all duration-300 shadow-md ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            }`}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </div>

        <div className="text-center text-xs text-gray-500 mt-8">
          © {new Date().getFullYear()}{" "}
          <span className="font-medium text-purple-600">Kokoru</span> | Secure Access
        </div>
      </form>
    </main>
  );
}
