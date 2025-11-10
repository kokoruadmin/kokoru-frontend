"use client";

import { useRef } from "react";
import ShippingLabel from "../../../components/ShippingLabel";

export default function ShippingLabelPreview({ open, order, onClose }) {
  const labelRef = useRef(null);

  if (!open || !order) return null;

  /* -----------------------------
      🖨️ PRINT FUNCTION
  ----------------------------- */
  const handlePrint = async () => {
    if (!labelRef.current) return;

    const { default: html2canvas } = await import("html2canvas");

    // Use hidden iframe to avoid inheriting global Tailwind CSS
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

    const cloned = labelRef.current.cloneNode(true);
    cloned.querySelectorAll("script").forEach((s) => s.remove());
    doc.body.appendChild(cloned);

    try {
      const canvas = await html2canvas(doc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const dataUrl = canvas.toDataURL("image/png");
      const w = window.open("", "_blank", "width=600,height=800");
      if (!w) return alert("Please allow pop-ups to print.");

      w.document.write(`
        <html>
          <head><title>Shipping Label</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;background:white">
            <img src="${dataUrl}" style="width:100%;"/>
          </body>
        </html>
      `);
      w.document.close();

      setTimeout(() => {
        w.focus();
        w.print();
      }, 500);
    } finally {
      iframe.remove();
    }
  };

  /* -----------------------------
      ⬇️ PDF EXPORT FUNCTION
  ----------------------------- */
  const handleDownloadPdf = async () => {
    if (!labelRef.current) return;

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    // Render in a hidden iframe to avoid Tailwind's modern color functions
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
    doc.write(`<html><head><style>html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}img{max-width:100%}</style></head><body></body></html>`);
    doc.close();

    const cloned = labelRef.current.cloneNode(true);
    cloned.querySelectorAll("script").forEach((s) => s.remove());
    doc.body.appendChild(cloned);

    try {
      const canvas = await html2canvas(doc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a6" });

      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, w, h, undefined, "FAST");
      pdf.save(`ShippingLabel-${order._id}.pdf`);
    } finally {
      iframe.remove();
    }
  };

  /* -----------------------------
      🔲 MODAL UI
  ----------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-4 w-[460px] max-w-[95vw] relative">
        {/* ---------- Header ---------- */}
        <div className="flex justify-between items-center mb-3 border-b pb-2">
          <h3 className="text-lg font-semibold text-purple-700">
            Shipping Label
          </h3>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              title="Download PDF"
            >
              ⬇️ PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              title="Print Label"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm hover:text-purple-700"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ---------- Label Content ---------- */}
        <div className="overflow-auto max-h-[80vh]">
          <div
            ref={labelRef}
            style={{
              all: "unset",
              display: "block",
              background: "white",
              padding: 0,
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
              color: "#111",
            }}
          >
            <ShippingLabel
              order={order}
              brandGroup={pickBrandByCategory(order)}
              senderAddress="Main Office, Kokoru Brand PVT LMT, Kerala"
              senderPhone="9113435126"
              senderCityState="Kollam, Kerala"
              contentCategory={pickCategoryName(order)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Helpers -------- */
function pickBrandByCategory(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const cats = items.map((i) => (i.category || "").toLowerCase());
  if (cats.some((c) => c.includes("jewel"))) return "Kokoru Crafts";
  if (cats.some((c) => c.includes("tea"))) return "Kokoru Crafts";
  if (cats.some((c) => c.includes("cloth") || c.includes("apparel")))
    return "Kokoru Studio";
  return "Kokoru Studio";
}

function pickCategoryName(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const cat = (items[0]?.category || "").toLowerCase();
  if (cat.includes("cloth")) return "Clothings";
  if (cat.includes("jewel")) return "Jewelleries";
  if (cat.includes("tea")) return "Tea Packs";
  return "Merchandise";
}
