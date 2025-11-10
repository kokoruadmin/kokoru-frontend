"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Products", href: "/admin/products" },
    { name: "Orders", href: "/admin/orders" },
    { name: "Coupons", href: "/admin/coupons" },
    { name: "Stock", href: "/admin/stock" },
    { name: "Reviews", href: "/admin/reviews" }, // 🟣 NEW TAB ADDED
  ];

  const handleLogout = () => {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("kokoru_admin_token");
    localStorage.removeItem("kokoru_admin_user");
    localStorage.removeItem("kokoru_admin_expiry");
    window.location.href = "/admin/login";
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <h1 className="text-lg font-semibold text-purple-700">🌸 Kokoru Admin</h1>
        <div className="flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-all duration-200 ${
                pathname === link.href
                  ? "text-purple-700 border-b-2 border-purple-700 pb-0.5"
                  : "text-gray-600 hover:text-purple-700"
              }`}
            >
              {link.name}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="text-sm flex items-center gap-1 text-red-600 hover:text-red-700 transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
