"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "../context/CartContext";
import { ShoppingCart, LogIn, Home, Store, User, Menu, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart } = useCart();

  // 🟣 Hydration guard (safe placement)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // 🟣 States
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const popupRef = useRef();
  const [userForm, setUserForm] = useState({});

  const API_BASE = "http://localhost:5000";

  // 🟣 Effects
  useEffect(() => {
    const savedUser =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("kokoru_user"))
        : null;
    if (savedUser) setUser(savedUser);

    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target))
        setShowProfile(false);
    };
    const handleKey = (e) => e.key === "Escape" && setShowProfile(false);

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // 🟣 Derived values
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // 🟣 Logout
  const handleLogout = () => {
    localStorage.removeItem("kokoru_user");
    localStorage.removeItem("kokoru_token");
    setUser(null);
    setShowProfile(false);
    window.location.reload();
  };

  // 🟣 Menu
  const menuItems = [
    { label: "Home", href: "/", icon: <Home size={18} /> },
    { label: "Shop", href: "/shop", icon: <Store size={18} /> },
    { label: "Cart", href: "/cart", icon: <ShoppingCart size={18} /> },
    { label: "Profile", href: "/profile", icon: <User size={18} /> },
  ];

  // 🟢 Safe rendering (no hook order mismatch)
  return (
    <>
      {!hydrated ? (
        <div className="h-16 bg-white" />
      ) : (
        <>
          {/* 🌸 NAVBAR */}
          <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
              isScrolled
                ? "bg-white/95 backdrop-blur-md shadow-md border-b border-purple-100"
                : "bg-gradient-to-r from-purple-50 via-white to-purple-50/80 backdrop-blur-xl border-b border-purple-100"
            }`}
          >
            <div className="relative max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4 gap-3">
              {/* 🍔 Hamburger + Brand */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(true)}
                  className="text-purple-700 p-2 rounded-md hover:bg-purple-100 transition flex items-center justify-center"
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6" />
                </button>

                {/* 🟣 Kokoru Brand */}
                <Link href="/" className="flex flex-col leading-tight group select-none">
                  <h1 className="text-2xl font-extrabold text-purple-800 group-hover:scale-105 transition-transform">
                    Kokoru
                  </h1>
                  <span className="text-xs tracking-wide text-gray-600 italic">
                    {pathname && pathname.includes("/shop")
                      ? "Shopping 🛍️"
                      : "Crafted with love 🌸"}
                  </span>
                </Link>
              </div>

              {/* 🟣 Desktop Links */}
              <div className="hidden md:flex items-center gap-6">
                {["Home", "Shop"].map((label) => {
                  const href = label === "Home" ? "/" : "/shop";
                  return (
                    <Link
                      key={label}
                      href={href}
                      className={`text-sm font-medium hover:text-purple-700 transition ${
                        pathname === href ? "text-purple-700" : "text-gray-700"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}

                {/* 🛒 Cart */}
                <Link
                  href="/cart"
                  className="relative flex items-center gap-2 text-gray-700 hover:text-purple-700 transition"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-sm font-medium">Cart</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {/* 👤 Profile or Login */}
                {!user ? (
                  <Link
                    href={`/login?redirectTo=${encodeURIComponent(
                      pathname || "/"
                    )}`}
                    className="flex items-center text-gray-700 hover:text-purple-700 transition"
                    title="Login"
                  >
                    <LogIn className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="relative" ref={popupRef}>
                    <button
                      onClick={() => setShowProfile((s) => !s)}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-purple-50 transition"
                    >
                      <span className="text-sm font-medium text-purple-800">
                        {user.name ? user.name.split(" ")[0] : "You"}
                      </span>
                      <span className="text-2xl">👤</span>
                    </button>

                    {showProfile &&
                      typeof window !== "undefined" &&
                      createPortal(
                        <div
                          className="fixed inset-0 z-[999] flex items-start justify-end p-4 bg-black/30 md:bg-transparent"
                          onClick={() => setShowProfile(false)}
                        >
                          <div
                            className="bg-white border border-gray-200 rounded-xl shadow-lg w-64 p-5 animate-fadeIn mt-14 mr-4 md:mt-16 md:mr-8"
                            onClick={(e) => e.stopPropagation()}
                            ref={popupRef}
                          >
                            <div className="flex justify-end">
                              <button
                                onClick={() => setShowProfile(false)}
                                className="text-gray-400 hover:text-gray-700"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            <div className="text-center border-b pb-3 mb-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-400 text-white flex items-center justify-center rounded-full mx-auto text-xl font-bold shadow-inner">
                                {user.name
                                  ? user.name.charAt(0).toUpperCase()
                                  : "U"}
                              </div>

                              <p className="font-semibold text-purple-800 mt-2">
                                {user.name || "User"}
                              </p>
                              <p className="text-sm text-gray-700 font-medium">
                                {user.email || ""}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => {
                                  setShowProfile(false);
                                  router.push("/profile");
                                }}
                                className="w-full text-sm font-medium text-purple-700 hover:bg-purple-50 py-2 rounded-md transition flex items-center justify-center gap-2"
                              >
                                ✏️ Edit Profile
                              </button>

                              <button
                                onClick={() => {
                                  setShowProfile(false);
                                  router.push("/my-orders");
                                }}
                                className="w-full text-sm font-medium text-purple-700 hover:bg-purple-50 py-2 rounded-md transition flex items-center justify-center gap-2"
                              >
                                📦 My Orders
                              </button>

                              <button
                                onClick={() => {
                                  setShowProfile(false);
                                  handleLogout();
                                }}
                                className="w-full text-sm font-medium text-red-600 hover:bg-red-50 py-2 rounded-md transition flex items-center justify-center gap-2"
                              >
                                🚪 Logout
                              </button>
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}
                  </div>
                )}
              </div>

              {/* 📱 Mobile Right Side */}
              <div className="flex md:hidden items-center gap-4 ml-auto">
                <Link href="/cart" className="relative">
                  <ShoppingCart className="w-6 h-6 text-purple-700" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {!user ? (
                  <Link
                    href={`/login?redirectTo=${encodeURIComponent(
                      pathname || "/"
                    )}`}
                  >
                    <LogIn className="w-6 h-6 text-purple-700" />
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowProfile((s) => !s)}
                    className="text-2xl text-purple-700"
                  >
                    👤
                  </button>
                )}
              </div>
            </div>
          </nav>

          {/* 📋 Sidebar Drawer */}
          <aside
            className={`fixed top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-xl border-r border-purple-100 shadow-xl transform transition-transform duration-300 z-[60] ${
              menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="p-5 border-b border-purple-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-purple-700">Menu</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-gray-600 hover:text-purple-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col p-4 space-y-2">
              {menuItems.map(({ label, href, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition font-medium"
                >
                  {icon}
                  {label}
                </Link>
              ))}

              {user && (
                <>
                  <Link
                    href="/my-orders"
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition font-medium"
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium"
                  >
                    Logout
                  </button>
                </>
              )}
            </nav>

            <div className="absolute bottom-4 left-0 w-full text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Kokoru
            </div>
          </aside>

          {/* Overlay for Sidebar */}
          {menuOpen && (
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMenuOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
}
