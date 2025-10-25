"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function MyOrdersPage() {
  const [isClient, setIsClient] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const storedUser = JSON.parse(localStorage.getItem("kokoru_user"));
    if (!storedUser) {
      alert("Please login to view your orders.");
      window.location.href = "/login";
      return;
    }

    setUser(storedUser);
    fetchOrders(storedUser.email);
  }, [isClient]);

  const fetchOrders = async (email) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("kokoru_token");
      if (!token) {
        alert("Session expired. Please log in again.");
        window.location.href = "/login";
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/orders?userEmail=${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 🟣 If token invalid or expired
      if (res.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("kokoru_token");
        localStorage.removeItem("kokoru_user");
        window.location.href = "/login";
        return;
      }

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Build invoice HTML string
     ========================= */
  function buildInvoiceHTML(order) {
    const itemsHtml = Array.isArray(order.items)
      ? order.items
          .map(
            (it) => `
      <tr>
        <td>${it.name}</td>
        <td>${[it.colorName, it.sizeLabel].filter(Boolean).join(" / ") || "-"}</td>
        <td>₹${it.price}</td>
        <td>${it.quantity}</td>
        <td>₹${(it.price * it.quantity).toFixed(2)}</td>
      </tr>
    `
          )
          .join("")
      : "";

    const total = Number(order.amount || 0).toFixed(2);

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Invoice - ${order._id}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color:#111; margin:36px; }
          .header { border-bottom:2px solid #6b21a8; padding-bottom:12px; margin-bottom:16px; text-align:center; }
          .brand { color:#6b21a8; font-weight:700; font-size:22px; }
          table { width:100%; border-collapse:collapse; margin-top:12px; }
          th,td { border:1px solid #ddd; padding:8px; text-align:left; }
          th { background:#f3e8ff; color:#4b0082; }
          .total { font-weight:700; text-align:right; margin-top:12px; }
          .meta { margin-top:8px; font-size:14px; color:#333; }
          .buttons { margin-top:18px; text-align:center; }
          .btn { display:inline-block; padding:8px 14px; border-radius:8px; text-decoration:none; color:white; background:#6b21a8; margin:0 6px; }
          .btn-print { background:#4f46e5; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">Kokoru</div>
          <div>Elegant & Handmade with Love 🌸</div>
        </div>

        <div class="meta">
          <div><strong>Order ID:</strong> ${order._id}</div>
          <div><strong>Date:</strong> ${formatDate(order.createdAt)}</div>
          <div><strong>Status:</strong> ${order.status || "processing"}</div>
          <div><strong>Customer:</strong> ${order.customerName || order.userEmail || "N/A"}</div>
          <div><strong>Ship To:</strong> ${order.address?.address || "N/A"}</div>
        </div>

        <h3>Items</h3>
        <table>
          <thead>
            <tr><th>Product</th><th>Variant</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total">Total: ₹${total}</div>

        <div style="margin-top:28px;text-align:center;">
          <small>Thank you for shopping with Kokoru 🌸</small>
        </div>

        <div class="buttons">
          <a href="#" class="btn btn-print" onclick="window.print(); return false;">🖨️ Print</a>
        </div>
      </body>
      </html>
    `;
  }

  /* =========================
     Print invoice (user)
     ========================= */
  const printInvoice = async (orderId) => {
    if (!isClient) return;
    const token = localStorage.getItem("kokoru_token");
    if (!token) {
      alert("Session expired. Please log in again.");
      window.location.href = "/login";
      return;
    }

    const invoiceWindow = window.open("", "_blank", "width=900,height=1000");
    if (!invoiceWindow) {
      alert("⚠️ Please allow popups to view invoice.");
      return;
    }

    // Show temporary loading
    invoiceWindow.document.write(
      `<html><body style="font-family: Arial; text-align:center; padding:50px;"><h3>Generating invoice...</h3></body></html>`
    );
    invoiceWindow.document.close();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("kokoru_token");
        localStorage.removeItem("kokoru_user");
        window.location.href = "/login";
        return;
      }

      if (!res.ok) throw new Error("Order fetch failed");

      const order = await res.json();
      const html = buildInvoiceHTML(order);

      invoiceWindow.document.open();
      invoiceWindow.document.write(html);
      invoiceWindow.document.close();
    } catch (err) {
      console.error("❌ Error fetching order for invoice:", err);
      invoiceWindow.document.open();
      invoiceWindow.document.write(`<html><body style="padding:40px;color:red"><h3>Error: ${err.message}</h3></body></html>`);
      invoiceWindow.document.close();
    }
  };

/* =========================
   Download invoice (user) as PDF
   ========================= */
const downloadInvoice = async (orderId) => {
  const token = localStorage.getItem("kokoru_token");
  if (!token) {
    alert("Session expired. Please log in again.");
    window.location.href = "/login";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("kokoru_token");
      localStorage.removeItem("kokoru_user");
      window.location.href = "/login";
      return;
    }

    if (!res.ok) throw new Error("Order fetch failed");

    const order = await res.json();
    const html = buildInvoiceHTML(order);

    // Dynamically import html2pdf to keep bundle size light
    const html2pdf = (await import("html2pdf.js")).default;

    // Temporary element for conversion
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);

    const options = {
      margin: 0.5,
      filename: `kokoru-invoice-${order._id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    await html2pdf().from(tempDiv).set(options).save();
    tempDiv.remove();
  } catch (err) {
    console.error("❌ Download invoice failed:", err);
    alert("Failed to generate PDF. See console for details.");
  }
};

  if (!isClient)
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </main>
    );

  return (
    <main className="min-h-screen p-6 bg-purple-50 text-gray-800">
      <h1 className="text-2xl font-bold text-purple-700 mb-6 text-center">My Orders</h1>
      {loading && <p className="text-center text-gray-500">Loading orders...</p>}

      {(!loading && orders.length === 0) && (
        <p className="text-center text-gray-600">You have no orders yet.</p>
      )}

      <div className="max-w-4xl mx-auto space-y-4">
        {orders.map(order => (
          <div key={order._id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center border-b pb-2 mb-2">
              <div>
                <div className="text-sm text-gray-500">Order ID: {order._id}</div>
                <div className="text-xs text-gray-400">{formatDate(order.createdAt)}</div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                order.status === "paid" ? "bg-green-100 text-green-700"
                : order.status === "processing" ? "bg-yellow-100 text-yellow-700"
                : order.status === "shipped" ? "bg-blue-100 text-blue-700"
                : order.status === "delivered" ? "bg-purple-100 text-purple-700"
                : "bg-gray-200 text-gray-700"
              }`}>
                {order.status}
              </span>
            </div>

            <div className="text-sm text-gray-700">
              {order.items.map(it => (
                <div key={it.name + it.sizeLabel}>
                  {it.name} {it.colorName && `(${it.colorName}${it.sizeLabel ? " - " + it.sizeLabel : ""})`} × {it.quantity}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="font-medium">Total: ₹{order.amount}</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => printInvoice(order._id)}
                  className="text-purple-700 text-xs underline"
                >
                  View / Print Invoice
                </button>
                <button
                  onClick={() => downloadInvoice(order._id)}
                  className="text-gray-700 text-xs underline"
                >
                  Download Invoice
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
