import "../globals.css";
import { geistSans, geistMono } from "@/lib/fonts";
import AdminNavbar from "@/components/AdminNavbar";

export const metadata = {
  title: "Kokoru Admin Panel",
  description: "Manage Kokoru products, orders, coupons, and analytics",
};

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#faf7ff] min-h-screen text-gray-800`}
        >
          <AdminNavbar />
          <main className="max-w-7xl mx-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
