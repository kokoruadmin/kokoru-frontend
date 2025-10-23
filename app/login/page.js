"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search?.get("redirectTo") || "/shop";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        if (isClient) {
          localStorage.setItem("kokoru_token", data.token);
          localStorage.setItem("kokoru_user", JSON.stringify(data.user));
          window.location.href = redirectTo;
        }
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login error. See console.");
    }
  };

  // Prevent SSR crash
  if (!isClient) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      <form
        onSubmit={handleLogin}
        className="bg-white border border-purple-100 shadow-xl rounded-2xl p-8 w-full max-w-sm"
      >
        <h1 className="text-3xl font-extrabold text-purple-800 mb-2 text-center">
          Welcome Back 🌸
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Log in to continue your Kokoru journey
        </p>

        <input
          type="email"
          placeholder="Email"
          className="w-full border border-purple-200 rounded-lg px-3 py-2 mb-3 text-gray-800 focus:ring-2 focus:ring-purple-400 focus:outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border border-purple-200 rounded-lg px-3 py-2 mb-5 text-gray-800 focus:ring-2 focus:ring-purple-400 focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full py-2.5 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition"
        >
          Login
        </button>

        <p className="text-sm text-center mt-4 text-gray-700">
          Don’t have an account?{" "}
          <Link
            href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="text-purple-700 font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </main>
  );
}
