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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full min-h-screen flex justify-center bg-[#faf7ff]`}
        suppressHydrationWarning
      >
    <main className="min-h-screen bg-[#faf7ff] p-4 sm:p-6 text-gray-800">
          {children}
        </main>
      </body>
    </html>
  );
}
