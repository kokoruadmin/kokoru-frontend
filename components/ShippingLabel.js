// app/components/ShippingLabel.jsx
"use client";

export default function ShippingLabel({
  order,
  brandGroup = "Kokoru Studio",      // “Kokoru Studio” (clothing), “Kokoru Crafts” (jewellery/crafts)
  senderAddress = "Main Office, Kokoru Brand PVT LMT, Kerala",
  senderPhone = "9113435126",
  senderCityState = "Kollam, Kerala",
  contentCategory = "Merchandise",    // e.g., "Clothings", "Jewelleries", "Tea Packs"
}) {
  if (!order) return null;

  return (
    <div id="label-root" style={labelWrap}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>COURIER LABEL</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={secTitle}>TO:</div>
          <div style={line}>{order.customerName || "-"}</div>
          <div style={{ ...line, whiteSpace: "pre-wrap" }}>
            {(order.address?.address || "").split(/[\n,]+/).map((line, i) => <div key={i}>{line.trim()}</div>)}
          </div>
          <div style={line}>📞 {order.address?.phone || order.phone || "-"}</div>
        </div>
        <div>
          <div style={secTitle}>FROM:</div>
          <div style={line}>{brandGroup}</div>
          <div style={line}>{senderAddress}</div>
          <div style={line}>{senderCityState}</div>
          <div style={line}>📞 {senderPhone}</div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={line}><strong>Item:</strong> {contentCategory}</div>
        <div style={line}><strong>Order ID:</strong> {order._id}</div>
      </div>
    </div>
  );
}

const labelWrap = {
  width: 400,          // fits 10x15cm when scaled to PDF (we’ll scale with jsPDF)
  padding: 16,
  background: "white",
  border: "2px dashed #333",
  borderRadius: 8,
  color: "#111",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const secTitle = { fontWeight: 700, marginBottom: 4, color: "#111" };
const line = { marginBottom: 4, color: "#222", fontSize: 13 };
