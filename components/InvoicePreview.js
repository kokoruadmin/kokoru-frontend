// app/components/InvoicePreview.jsx
"use client";

export default function InvoicePreview({ order, brand = "Kokoru Studio", senderCityState = "Kollam, Kerala", supportEmail = "Help@Kokaru.in" }) {
  if (!order) return null;

  const format = (d) => {
    try { return new Date(d).toLocaleString("en-IN"); } catch { return d; }
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.amount || 0);

  return (
    <div id="invoice-root" style={{ width: 794, padding: 28, background: "white", color: "#111", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ borderBottom: "2px solid #6b21a8", paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ color: "#6b21a8", fontWeight: 700, fontSize: 22 }}>Kokoru</div>
        <div style={{ color: "#555", fontSize: 13 }}>Invoice for Order {order._id}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div><strong>Brand:</strong> {brand}</div>
          <div><strong>Date:</strong> {format(order.createdAt)}</div>
          <div><strong>Location:</strong> {senderCityState}</div>
          <div><strong>Support:</strong> {supportEmail}</div>
        </div>
        <div>
          <div><strong>Customer:</strong> {order.customerName || "-"}</div>
          <div style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>
            {(order.address?.address || "").split(/[\n,]+/).map((line, i) => <div key={i}>{line.trim()}</div>)}
          </div>
          <div><strong>Email:</strong> {order.userEmail || "N/A"}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <th style={th}>Product</th>
            <th style={th}>Variant</th>
            <th style={{ ...th, textAlign: "right" }}>Price</th>
            <th style={{ ...th, textAlign: "center" }}>Qty</th>
            <th style={{ ...th, textAlign: "right" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td style={td}>{it.name}</td>
              <td style={td}>{[it.colorName, it.sizeLabel].filter(Boolean).join(" / ") || "-"}</td>
              <td style={{ ...td, textAlign: "right" }}>₹{Number(it.price || 0).toFixed(2)}</td>
              <td style={{ ...td, textAlign: "center" }}>{Number(it.quantity || 0)}</td>
              <td style={{ ...td, textAlign: "right" }}>₹{(Number(it.price || 0) * Number(it.quantity || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: "right", marginTop: 12, fontWeight: 700, fontSize: 16 }}>
        Total: ₹{total.toFixed(2)}
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>Thank you for shopping with Kokoru 🌸</div>
    </div>
  );
}

const th = {
  border: "1px solid #ddd",
  padding: 8,
  textAlign: "left",
  background: "#f3e8ff",
  color: "#4b0082",
  fontWeight: 700,
};

const td = {
  border: "1px solid #ddd",
  padding: 8,
  textAlign: "left",
};
