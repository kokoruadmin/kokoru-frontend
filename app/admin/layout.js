// app/admin/layout.js
import "../globals.css";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Kokoru Admin Panel",
  description: "Manage Kokoru products and collections",
};

export default function AdminLayout({ children }) {
  return (
    <html
      lang="en"
      className="min-h-screen w-full bg-gradient-to-br from-purple-50 via-pink-50 to-white text-gray-800"
      style={{
        margin: 0,
        padding: 0,
        backgroundColor: "rgb(250, 245, 255)", // fallback
      }}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex justify-center items-start`}
        style={{
          background: "transparent",
          margin: 0,
          padding: 0,
          width: "100%",
          overflowX: "hidden",
        }}
        suppressHydrationWarning
      >
        <main className="w-full max-w-7xl p-6">{children}</main>
      </body>
    </html>
  );
}
