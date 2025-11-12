"use client";
import Link from "next/link";

export default function InvoicePreview({
  order,
  brand = "Kokoru Studio",
  senderCityState = "Kollam, Kerala",
  supportEmail = "help@kokoru.in",
}) {
  if (!order) return null;

  const format = (d) => {
    try {
      return new Date(d).toLocaleString("en-IN");
    } catch {
      return d;
    }
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
  const discount = Number(order.discountAmount || 0);
  const totalPaid = Number(order.totalAfterDiscount || order.amount || 0);

  const coupon = order.coupon || null;
  let couponCalcText = "";
  if (coupon && (coupon.discountType === "percent" || coupon.discountType === "flat")) {
    if (coupon.discountType === "percent") {
      const pct = Number(coupon.discountValue || 0);
      const raw = (subtotal * pct) / 100;
      const cap = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;
      const applied = cap ? Math.min(raw, cap) : raw;
      couponCalcText = `${pct}% of ₹${subtotal.toFixed(2)} = ₹${raw.toFixed(2)}`;
      if (cap) couponCalcText += ` (capped at ₹${cap.toFixed(2)} → applied ₹${applied.toFixed(2)})`;
      else couponCalcText += ` → applied ₹${discount.toFixed(2)}`;
    } else {
      const flat = Number(coupon.discountValue || 0);
      couponCalcText = `Flat ₹${flat.toFixed(2)} → applied ₹${discount.toFixed(2)}`;
    }
  } else if (discount > 0) {
    couponCalcText = `Discount applied: ₹${discount.toFixed(2)}`;
  }

  return (
    <div
      id="invoice-root"
      style={{
        width: 794,
        padding: 28,
        background: "#fff",
        color: "#111",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* 🔹 Header */}
      <div
        style={{
          borderBottom: "2px solid #6b21a8",
          paddingBottom: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ color: "#6b21a8", fontWeight: 700, fontSize: 24 }}>
          Kokoru
        </div>
        <div style={{ color: "#555", fontSize: 13 }}>
          Invoice for Order #{order._id}
        </div>
      </div>

      {/* 🔹 Meta Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 14,
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <div>
          <div><strong>Brand:</strong> {brand}</div>
          <div><strong>Date:</strong> {format(order.createdAt)}</div>
          <div><strong>Location:</strong> {senderCityState}</div>
          <div><strong>Support:</strong> {supportEmail}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div><strong>Customer:</strong> {order.customerName || "-"}</div>
          <div style={{ maxWidth: 320, whiteSpace: "pre-wrap", marginTop: 4 }}>
            {
              (() => {
                const { normalizeAddress } = require("../utils/addressHelper");
                const a = normalizeAddress(order.address || {});
                return (a.address || "").split(/[\n,]+/).map((line, i) => <div key={i}>{line.trim()}</div>);
              })()
            }
          </div>
          <div style={{ marginTop: 4 }}>
            {(() => {
              const { normalizeAddress } = require("../utils/addressHelper");
              const a = normalizeAddress(order.address || {});
              return (
                <>
                  {a.pincode ? <div><strong>Pincode:</strong> {a.pincode}</div> : null}
                  {a.place ? <div><strong>Place:</strong> {a.place}</div> : null}
                  {a.landmark ? <div><strong>Landmark:</strong> {a.landmark}</div> : null}
                </>
              );
            })()}
            <div style={{ marginTop: 4 }}>
              <strong>Email:</strong> {order.userEmail || "N/A"}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>Contact:</strong> {order.contact || order.address?.mobile || "N/A"}{order.address?.alternateMobile ? ` • Alt: ${order.address.alternateMobile}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 Items Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 8,
          fontSize: 13,
        }}
      >
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
              <td style={td}>
                {it.productId || it._id ? (
                  <Link href={`/product/${it.productId || it._id}`} className="text-purple-700 hover:underline">
                    {it.name}
                  </Link>
                ) : (
                  it.name
                )}
              </td>
              <td style={td}>
                {[it.colorName, it.sizeLabel]
                  .filter(Boolean)
                  .join(" / ") || "-"}
              </td>
              <td style={{ ...td, textAlign: "right" }}>
                ₹{Number(it.price || 0).toFixed(2)}
              </td>
              <td style={{ ...td, textAlign: "center" }}>
                {Number(it.quantity || 0)}
              </td>
              <td style={{ ...td, textAlign: "right" }}>
                ₹{(Number(it.price || 0) * Number(it.quantity || 0)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔹 Totals Section */}
      <div
        style={{
          textAlign: "right",
          marginTop: 16,
          borderTop: "1px solid #ddd",
          paddingTop: 12,
          fontSize: 14,
        }}
      >
        <div style={{ borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 10 }}>
          <div>
            <strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}
          </div>

          {discount > 0 && (
              <div style={{ color: "#059669" }}>
                <strong>Less {order?.coupon?.code ? `Coupon (${order.coupon.code})` : 'Discount'}:</strong>{" "}-₹{discount.toFixed(2)}
                {couponCalcText && (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{couponCalcText}</div>
                )}
              </div>
          )}
        </div>

        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#4b0082",
          }}
        >
          <strong>Net Amount:</strong> ₹{totalPaid.toFixed(2)}
        </div>
      </div>

      {/* 🔹 Footer */}
      <div
        style={{
          marginTop: 24,
          textAlign: "center",
          fontSize: 13,
          color: "#555",
        }}
      >
        Thank you for shopping with <strong>Kokoru 🌸</strong><br />
        <span style={{ fontSize: 12, color: "#888" }}>
          Handmade with love — {brand}
        </span>
      </div>
    </div>
  );
}

/* 🔹 Table Header & Data Styles */
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
