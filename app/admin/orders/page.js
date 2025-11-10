"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import InvoicePreview from "@/components/InvoicePreview";
import ShippingLabel from "@/components/ShippingLabel";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/* -------- ENV CONFIG -------- */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/* -------- COMPONENT -------- */
export default function OrdersPage() {
  const [isClient, setIsClient] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState({ q: "" });
  const [statusModal, setStatusModal] = useState({ open: false, order: null });
  const [statusChoice, setStatusChoice] = useState('');
  const [updatingOrders, setUpdatingOrders] = useState({});
  const [previewInvoice, setPreviewInvoice] = useState({ open: false, order: null });
  const [previewLabel, setPreviewLabel] = useState({ open: false, order: null });

  const invoiceRef = useRef(null);
  const labelRef = useRef(null);

  /* ---------------- MOUNT CHECK ---------------- */
  useEffect(() => {
    setIsClient(true);
  }, []);

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    if (!isClient) return;
    const token = localStorage.getItem("kokoru_admin_token");
    if (!token) window.location.href = "/admin/login";
  }, [isClient]);

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("kokoru_admin_token");
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to load orders");
    }
  };

  useEffect(() => {
    if (isClient) fetchOrders();
  }, [isClient]);

  /* ---------------------- POLL ORDERS (every 15s) ---------------------- */
  useEffect(() => {
    if (!isClient) return;
    const id = setInterval(() => {
      try {
        fetchOrders();
      } catch (e) {
        // swallow
      }
    }, 15000);
    return () => clearInterval(id);
  }, [isClient]);

  /* ---------------- FILTERED ORDERS ---------------- */
  const filteredOrders = useMemo(() => {
    const q = (filter.q || "").trim().toLowerCase();
    return orders
      .filter(
        (o) =>
          (o.customerName || "").toLowerCase().includes(q) ||
          (o.userEmail || "").toLowerCase().includes(q) ||
          (o.address?.address || "").toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, filter.q]);

  /* ---------------- STATUS UPDATE ---------------- */
  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrders((s) => ({ ...s, [orderId]: true }));
    try {
      const token = localStorage.getItem("kokoru_admin_token");
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => null);
        throw new Error(errText || "Failed to update status");
      }
      alert("✅ Status updated");
      setStatusModal({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Error updating order: " + (err.message || ""));
    } finally {
      setUpdatingOrders((s) => ({ ...s, [orderId]: false }));
    }
  };

  // Watch for modal open to initialize selected status
  useEffect(() => {
    if (statusModal.open && statusModal.order) {
      setStatusChoice(statusModal.order.status || 'processing');
    }
  }, [statusModal]);

  /* ---------------- DELETE ORDER ---------------- */
  const deleteOrder = async (id) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const token = localStorage.getItem("kokoru_admin_token");
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("Order deleted successfully!");
        fetchOrders();
      } else {
        alert(data.message || "Failed to delete order");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting order");
    }
  };

  /* ---------------- EXPORT HELPERS ---------------- */
const exportNodeToPdf = async (node, filename, { format = "a4", margin = 8 } = {}) => {
  if (!node) return;

  // Render the node inside a hidden iframe to avoid inheriting global Tailwind CSS
  // (which may use modern color functions like lab()/oklch() that html2canvas cannot parse).
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.overflow = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;

  // Minimal reset to avoid complex inherited styles
  const resetCss = `
    html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}
    img{max-width:100%}
  `;

  doc.open();
  doc.write(`<html><head><style>${resetCss}</style></head><body></body></html>`);
  doc.close();

  // Clone the node into the iframe body
  const cloned = node.cloneNode(true);
  // Remove inline scripts and event handlers if any
  cloned.querySelectorAll("script").forEach((s) => s.remove());
  doc.body.appendChild(cloned);

  try {
    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#fff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const w = pageWidth - margin * 2;
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", margin, margin, w, h);
    pdf.save(filename);
  } finally {
    // Clean up iframe
    iframe.remove();
  }
};

  const printNode = async (node) => {
    // Use hidden iframe so html2canvas won't parse app global CSS
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.overflow = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<html><head><style>html,body{margin:0;padding:0;background:#fff}</style></head><body></body></html>`);
    doc.close();

    const cloned = node.cloneNode(true);
    cloned.querySelectorAll("script").forEach((s) => s.remove());
    doc.body.appendChild(cloned);

    try {
      const canvas = await html2canvas(doc.body, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const dataUrl = canvas.toDataURL("image/png");
      const w = window.open("", "_blank", "width=800,height=1000");
      if (!w) return alert("Please allow popups for print");
      w.document.write(`<html><body style="margin:0"><img src="${dataUrl}" style="width:100%"/></body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 400);
    } finally {
      iframe.remove();
    }
  };

  /* ---------------- STATUS COLOR ---------------- */
  const getStatusBadge = (status) => {
    const map = {
      processing: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-amber-100 text-amber-800",
      shipped: "bg-blue-100 text-blue-800",
  packed: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-orange-100 text-orange-700",
      paid: "bg-purple-100 text-purple-800",
      failed: "bg-gray-200 text-gray-700",
    };
    return map[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  if (!isClient) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading Orders...</div>;
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-purple-700">📦 Orders</h1>
        <input
          className="border p-2 rounded w-64 text-sm"
          placeholder="Search name, email, address"
          value={filter.q || ""}
          onChange={(e) => setFilter({ q: e.target.value })}
        />
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-gray-500">No orders found</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-purple-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th>Customer</th>
                <th>Address</th>
                <th>Items</th>
                <th className="text-center">Total</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o._id} className="border-t hover:bg-gray-50">
                  <td className="p-2 text-xs text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td>{o.customerName || o.userEmail}</td>
                  <td className="text-xs text-gray-600 max-w-xs whitespace-pre-line">
                    {o.address?.address}
                  </td>
                  <td>
                    {Array.isArray(o.items)
                      ? o.items.map((it) => `${it.name} x${it.quantity}`).join(", ")
                      : ""}
                  </td>
                  <td className="text-center font-medium">
                    ₹{o.totalAfterDiscount ?? o.amount ?? 0}
                  </td>
                  <td className="text-center space-y-1">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                        o.status
                      )}`}
                    >
                      {o.status}
                    </span>

                    <div className="flex justify-center gap-1 mt-1">
                      <button
                        onClick={() => setPreviewInvoice({ open: true, order: o })}
                        className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                      >
                        🧾 Invoice
                      </button>
                      <button
                        onClick={() => setPreviewLabel({ open: true, order: o })}
                        className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                      >
                        🏷 Label
                      </button>
                      <button
                        onClick={() => setStatusModal({ open: true, order: o })}
                        className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => deleteOrder(o._id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- INVOICE PREVIEW ---------- */}
      {previewInvoice.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-4 w-[860px] max-w-[95vw]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-purple-700">Invoice Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    exportNodeToPdf(invoiceRef.current, `invoice-${previewInvoice.order._id}.pdf`)
                  }
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  ⬇️ PDF
                </button>
                <button
                  onClick={() => printNode(invoiceRef.current)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setPreviewInvoice({ open: false, order: null })}
                  className="px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div ref={invoiceRef} className="overflow-auto max-h-[80vh] bg-white">
              <InvoicePreview order={previewInvoice.order} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- SHIPPING LABEL PREVIEW ---------- */}
      {previewLabel.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-4 w-[460px] max-w-[95vw]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-purple-700">Shipping Label</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    exportNodeToPdf(labelRef.current, `label-${previewLabel.order._id}.pdf`, {
                      format: "a6",
                    })
                  }
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  ⬇️ PDF
                </button>
                <button
                  onClick={() => printNode(labelRef.current)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setPreviewLabel({ open: false, order: null })}
                  className="px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div ref={labelRef} className="overflow-auto max-h-[80vh] bg-white">
              <ShippingLabel order={previewLabel.order} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- STATUS UPDATE MODAL ---------- */}
      {statusModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[420px] max-w-[95vw]">
            <h3 className="text-lg font-semibold text-purple-700 mb-3">Update Order Status</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Order</label>
                <div className="text-sm text-gray-700">{statusModal.order?._id}</div>
              </div>
              <div>
                <label className="text-sm font-medium">Select status</label>
                <select value={statusChoice} onChange={(e) => setStatusChoice(e.target.value)} className="w-full border rounded px-3 py-2 mt-1">
                  <option value="processing">Processing</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setStatusModal({ open: false, order: null })}
                  className="px-3 py-1 bg-gray-100 rounded"
                  disabled={updatingOrders[statusModal.order?._id]}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!statusChoice) return alert('Please select a status');
                    updateOrderStatus(statusModal.order._id, statusChoice);
                  }}
                  className="px-4 py-1 bg-purple-600 text-white rounded"
                  disabled={updatingOrders[statusModal.order?._id]}
                >
                  {updatingOrders[statusModal.order?._id] ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
