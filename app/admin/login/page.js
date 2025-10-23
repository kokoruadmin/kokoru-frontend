"use client";

import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "kokoru_super_admin_2025"; // fallback

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
        alert("Access denied: Not an admin account");
        return;
      }

      localStorage.setItem("kokoru_token", data.token);
      localStorage.setItem("kokoru_user", JSON.stringify(data.user));
      alert("✅ Welcome Admin!");
      window.location.href = "/admin"; // redirect to main dashboard
    } catch (err) {
      console.error("Admin login error:", err);
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-100 to-white">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-xl p-8 rounded-2xl w-full max-w-md border border-purple-100"
      >
        <h1 className="text-2xl font-bold text-purple-700 mb-6 text-center">
          👑 Admin Login
        </h1>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Secret Admin Key
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-purple-400"
              placeholder="Enter Admin Key"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 mt-4 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-700 hover:bg-purple-800 shadow-md"
            }`}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </div>
      </form>
    </main>
  );
}
