"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, KeyRound, ArrowRight } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if admin is already logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const adminToken = localStorage.getItem("kokoru_admin_token");
      if (adminToken) {
        router.push("/admin");
        return;
      }
      setCheckingAuth(false);
    }
  }, [router]);

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600">Checking authentication...</p>
        </div>
      </main>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, passkey }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("kokoru_admin_token", data.token);
      localStorage.setItem("kokoru_admin_user", JSON.stringify(data.user));
      window.location.href = "/admin";
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-purple-200 shadow-lg rounded-3xl p-8">
        <h1 className="text-4xl font-extrabold text-center text-purple-800 mb-2">Kokoru Admin Login</h1>
        <p className="text-center text-gray-600 mb-8 text-sm">Secure Access Panel <span className="text-pink-400">🌸</span></p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
            <input
              type="text"
              placeholder="Admin Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-14 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-900"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-14 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-900"
              required
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
            <input
              type="password"
              placeholder="Admin Passkey"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              className="w-full pl-14 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-3 mt-4 rounded-full flex items-center justify-center gap-3 text-white text-lg font-semibold tracking-wide shadow-lg ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-300"
            }`}
          >
            <ArrowRight size={18} />
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-8">
          © {new Date().getFullYear()} <span className="font-medium text-purple-700">Kokoru Lifestyle</span>
        </p>
      </div>
    </main>
  );
}
