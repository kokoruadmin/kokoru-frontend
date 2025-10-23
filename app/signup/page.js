"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SignupPage() {
  const search = useSearchParams();
  const [redirectTo, setRedirectTo] = useState("/shop");
  const [isClient, setIsClient] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");
  const [password, setPassword] = useState("");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // ✅ Only run client-side logic after mount
  useEffect(() => {
    setIsClient(true);
    const param = search?.get("redirectTo");
    if (param) setRedirectTo(param);
  }, [search]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!isClient) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          mobile,
          defaultAddress,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("🎉 Account created successfully!");
        if (data.token && data.user) {
          localStorage.setItem("kokoru_token", data.token);
          localStorage.setItem("kokoru_user", JSON.stringify(data.user));
          window.location.href = redirectTo;
        } else {
          window.location.href = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
        }
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Signup error. See console.");
    }
  };

  if (!isClient) return null; // ⛔️ Prevent SSR mismatch

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-white text-gray-800">
      <form
        onSubmit={handleSignup}
        className="bg-white border border-purple-100 shadow-lg rounded-2xl p-8 w-full max-w-md"
      >
        {/* 🟣 Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-purple-800">
            Create Account
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Join Kokoru and shop with love 🌸
          </p>
        </div>

        {/* 📝 Form Fields */}
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800 placeholder-gray-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800 placeholder-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="Mobile number"
            className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800 placeholder-gray-400"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
          <textarea
            placeholder="Default shipping address"
            className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800 placeholder-gray-400 resize-none"
            value={defaultAddress}
            onChange={(e) => setDefaultAddress(e.target.value)}
            rows={3}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800 placeholder-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* 💾 Submit */}
        <button
          type="submit"
          className="mt-6 w-full py-2.5 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition"
        >
          Sign Up
        </button>

        {/* 🔗 Footer */}
        <p className="text-sm text-center mt-5 text-gray-700">
          Already have an account?{" "}
          <Link
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="text-purple-700 font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
