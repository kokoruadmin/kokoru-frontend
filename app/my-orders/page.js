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
    if (!isClient) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders?userEmail=${encodeURIComponent(email)}`);
      const data = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = async (orderId) => {
    if (!isClient) return;
    const invoiceWindow = window.open("", "_blank", "width=900,height=1000");
    if (!invoiceWindow) {
      alert("⚠️ Please allow popups to view invoice.");
      return;
    }

    invoiceWindow.document.write(`<html><body style="text-align:center;padding:50px;"><h3>Generating invoice...</h3></body></html>`);
    invoiceWindow.document.close();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Order fetch failed");
      const order = await res.json();

      const html = `
        <html>
        <head>
          <title>Invoice - ${order._id}</title>
          <style>
            body { font-family: Arial; margin: 40px; color: #111; }
            .header { text-align:center; border-bottom:2px solid #6b21a8; margin-bottom:20px; }
            .brand { font-size:26px; font-weight:bold; color:#6b21a8; }
            table { width:100%; border-collapse:collapse; margin-top:10px; }
            th, td { border:1px solid #ccc; padding:8px; text-align:left; }
            th { background:#f3e8ff; color:#4b0082; }
            .total { text-align:right; font-weight:bold; margin-top:10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">Kokoru</div>
            <div>Elegant & Handmade with Love 🌸</div>
          </div>
          <p><strong>Order ID:</strong> ${order._id}<br/>
          <strong>Date:</strong> ${formatDate(order.createdAt)}<br/>
          <strong>Status:</strong> ${order.status}</p>

          <h3>Items</h3>
          <table>
            <tr><th>Product</th><th>Variant</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr>
            ${order.items.map(it => `
              <tr>
                <td>${it.name}</td>
                <td>${[it.colorName, it.sizeLabel].filter(Boolean).join(" / ") || "-"}</td>
                <td>₹${it.price}</td>
                <td>${it.quantity}</td>
                <td>₹${(it.price * it.quantity).toFixed(2)}</td>
              </tr>
            `).join("")}
          </table>
          <div class="total">Total: ₹${order.amount.toFixed(2)}</div>

          <p style="margin-top:40px;text-align:center;">Thank you for shopping with <b>Kokoru</b> 🌸</p>
          <button onclick="window.print()">🖨️ Print</button>
        </body></html>
      `;
      invoiceWindow.document.open();
      invoiceWindow.document.write(html);
      invoiceWindow.document.close();
    } catch (err) {
      invoiceWindow.document.body.innerHTML = `<p style='color:red;'>Error: ${err.message}</p>`;
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
              <button
                onClick={() => printInvoice(order._id)}
                className="text-purple-700 text-xs underline"
              >
                View / Print Invoice
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
