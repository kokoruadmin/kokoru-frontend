"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Home, ShoppingBag, Package, ShoppingCart, Ticket, BarChart3, MessageSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminNavbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("kokoru_admin_token");
      setIsLoggedIn(!!token);
    }
  }, []);

  // Don't show navbar on login page or if not logged in
  if (pathname === "/admin/login" || !isLoggedIn) {
    return null;
  }

  const navLinks = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Coupons", href: "/admin/coupons", icon: Ticket },
    { name: "Stock", href: "/admin/stock", icon: BarChart3 },
    { name: "Reviews", href: "/admin/reviews", icon: MessageSquare },
  ];

  const handleLogout = () => {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("kokoru_admin_token");
    localStorage.removeItem("kokoru_admin_user");
    localStorage.removeItem("kokoru_admin_expiry");
    window.location.href = "/admin/login";
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand/Logo */}
          <div className="flex items-center">
            <Link 
              href="/admin" 
              className="flex items-center gap-3 text-purple-700 hover:text-purple-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="text-xl font-bold hidden sm:block">Kokoru Admin</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const IconComponent = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-purple-100 text-purple-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-purple-700"
                  }`}
                >
                  <IconComponent size={16} />
                  <span className="hidden lg:block">{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button & Logout */}
          <div className="flex items-center gap-2">
            {/* Home Button */}
            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-purple-700 hover:bg-gray-50 rounded-md transition-all duration-200"
              title="Visit Store"
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:block">Store</span>
            </Link>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all duration-200"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-purple-100 pt-2 pb-3">
          <div className="grid grid-cols-3 gap-1">
            {navLinks.map((link) => {
              const IconComponent = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md text-xs transition-all duration-200 ${
                    isActive
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-purple-700"
                  }`}
                >
                  <IconComponent size={16} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
