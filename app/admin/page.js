// app/admin/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getImageUrl } from "../../utils/imageHelper";
import { LogOut } from "lucide-react";
import InvoicePreview from "../../components/InvoicePreview";
import ShippingLabel from "../../components/ShippingLabel";

/**
 * AdminPage — with Cloudinary uploads (progress) for Add & Edit product
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!API_BASE_URL) console.warn("⚠️ Missing NEXT_PUBLIC_API_BASE_URL env variable");
if (!CLOUD_NAME) console.warn("⚠️ Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable");
if (!UPLOAD_PRESET) console.warn("⚠️ Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env variable");

/** Turn off Tailwind in captured nodes (for html2canvas/jspdf correctness) */
const NO_TAILWIND = {
  all: "unset",
  display: "block",
  background: "white",
  padding: 0,
  margin: 0,
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#111",
};

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);

  const [activeTab, setActiveTab] = useState("products"); // products | orders | stats
  const [loading, setLoading] = useState(false);

  // Product add/edit
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    stock: 0,
    imageUrl: "",
    colors: [],
  });

  // ADD: each color has { name, hex, images[], urlsText, sizes[], uploads[] }
  const [addColors, setAddColors] = useState([
    { name: "", hex: "#ffffff", images: [], urlsText: "", sizes: [{ label: "", stock: 0 }], uploads: [] },
  ]);

  // Orders
  const [statusModal, setStatusModal] = useState({ open: false, order: null });
  const [filter, setFilter] = useState({ q: "" });

  // Invoice/Label preview modals
  const [previewInvoice, setPreviewInvoice] = useState({ open: false, order: null });
  const [previewLabel, setPreviewLabel] = useState({ open: false, order: null });

  // Hidden DOM refs for export
  const invoiceRef = useRef(null);
  const labelRef = useRef(null);

  /* ---------------------- AUTH (client-side guard) ---------------------- */
  useEffect(() => {
    const adminToken = localStorage.getItem("kokoru_admin_token");
    const adminUser = localStorage.getItem("kokoru_admin_user");
    const expiry = localStorage.getItem("kokoru_admin_expiry");

    if (!adminToken || !adminUser) {
      window.location.href = "/admin/login";
      return;
    }

    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem("kokoru_admin_token");
      localStorage.removeItem("kokoru_admin_user");
      localStorage.removeItem("kokoru_admin_expiry");
      alert("Session expired. Please log in again.");
      window.location.href = "/admin/login";
      return;
    }

    try {
      const parsed = JSON.parse(adminUser);
      if (!parsed.isAdmin) {
        localStorage.clear();
        alert("Access denied. Admins only.");
        window.location.href = "/";
      }
    } catch {
      localStorage.clear();
      window.location.href = "/admin/login";
    }
  }, []);

  /* ---------------------- LOGOUT ---------------------- */
  const handleLogout = () => {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("kokoru_admin_token");
    localStorage.removeItem("kokoru_admin_user");
    localStorage.removeItem("kokoru_admin_expiry");
    window.location.href = "/admin/login";
  };

  /* ---------------------- FETCH PRODUCTS ---------------------- */
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (!res.ok) {
        console.error("Fetch products failed", res.status);
        setProducts([]);
        return;
      }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch products error:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------- FETCH ORDERS (SECURE ADMIN ROUTE) ---------------------- */
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("kokoru_admin_token");
      if (!token) {
        alert("Session expired. Please log in again.");
        window.location.href = "/admin/login";
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("kokoru_admin_token");
        localStorage.removeItem("kokoru_admin_user");
        localStorage.removeItem("kokoru_admin_expiry");
        alert("Unauthorized. Please log in again.");
        window.location.href = "/admin/login";
        return;
      }

      if (!res.ok) {
        console.error("Fetch orders failed", res.status);
        setOrders([]);
        return;
      }

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------- GROUPED PRODUCTS & STATS ---------------------- */
  const grouped = useMemo(() => {
    return products.reduce((acc, p) => {
      const cat = p.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [products]);

  useEffect(() => {
    if (!products.length) return setStats(null);
    let totalProducts = products.length;
    let totalVariants = 0;
    let totalStock = 0;
    for (const p of products) {
      if (Array.isArray(p.colors) && p.colors.length) {
        for (const c of p.colors) {
          totalVariants += (c.sizes || []).length || 1;
          for (const s of (c.sizes || [])) totalStock += Number(s.stock || 0);
        }
      } else {
        totalVariants += 1;
        totalStock += Number(p.stock || 0);
      }
    }
    setStats({ totalProducts, totalVariants, totalStock });
  }, [products]);

  /* ---------------------- PRODUCT HELPERS (EDIT/ADD/DELETE) ---------------------- */
  const openEditModal = (product) => {
    // Normalize color.images to array + add uploads[] and urlsText helper
    const copy = JSON.parse(JSON.stringify(product || {}));
    if (Array.isArray(copy.colors)) {
      copy.colors = copy.colors.map((c) => ({
        ...c,
        images: Array.isArray(c.images) ? c.images : (c.images ? [c.images] : []),
        urlsText: "",
        uploads: [], // for progress cards
      }));
    }
    setEditingProduct(copy);
    setActiveTab("products");
  };

  const saveEditing = async () => {
    if (!editingProduct || !editingProduct._id) return alert("No product loaded");
    try {
      // Apply addStock deltas + merge pasted URLs
      if (Array.isArray(editingProduct.colors)) {
        editingProduct.colors.forEach((c) => {
          const pasted = (c.urlsText || "")
            .split(/[\n,]+/)
            .map((x) => x.trim())
            .filter(Boolean);
          c.images = Array.from(new Set([...(c.images || []), ...pasted]));
          c.urlsText = "";

          c.sizes = (c.sizes || []).map((s) => {
            if (s.addStock) {
              const newStock = Math.max(Number(s.stock || 0) + Number(s.addStock || 0), 0);
              return { ...s, stock: newStock, addStock: undefined };
            }
            return s;
          });
        });
      }
      if (editingProduct.addStock) {
        editingProduct.stock = Math.max(
          Number(editingProduct.stock || 0) + Number(editingProduct.addStock || 0),
          0
        );
        delete editingProduct.addStock;
      }

      const payload = { ...editingProduct };
      // Remove helper fields
      if (Array.isArray(payload.colors)) {
        payload.colors = payload.colors.map(({ urlsText, uploads, ...rest }) => rest);
      }

      const res = await fetch(`${API_BASE_URL}/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to update product");
      }
      alert("✅ Product updated");
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("Save edit error:", err);
      alert("Failed to save product. See console.");
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Deleted");
      fetchProducts();
    } catch (err) {
      console.error("Delete product error:", err);
      alert("Failed to delete product");
    }
  };

  // Add product helpers
  const addColorRow = () =>
    setAddColors((p) => [
      ...p,
      { name: "", hex: "#ffffff", images: [], urlsText: "", sizes: [{ label: "", stock: 0 }], uploads: [] },
    ]);
  const removeAddColor = (i) => setAddColors((p) => p.filter((_, idx) => idx !== i));
  const addSizeRowForAdd = (ci) =>
    setAddColors((p) =>
      p.map((c, idx) =>
        idx === ci ? { ...c, sizes: [...(c.sizes || []), { label: "", stock: 0 }] } : c
      )
    );
  const removeSizeRowForAdd = (ci, si) =>
    setAddColors((p) =>
      p.map((c, idx) =>
        idx === ci ? { ...c, sizes: (c.sizes || []).filter((_, j) => j !== si) } : c
      )
    );
  const resetAddForm = () => {
    setNewProduct({
      name: "",
      description: "",
      category: "",
      price: "",
      stock: 0,
      imageUrl: "",
      colors: [],
    });
    setAddColors([
      { name: "", hex: "#ffffff", images: [], urlsText: "", sizes: [{ label: "", stock: 0 }], uploads: [] },
    ]);
  };

  function buildColorsFromAdd() {
    return addColors
      .map((c) => {
        const pasted = (c.urlsText || "")
          .split(/[\n,]+/)
          .map((x) => x.trim())
          .filter(Boolean);
        const images = Array.from(new Set([...(c.images || []), ...pasted]));
        const sizes = (c.sizes || []).map((s) => ({
          label: s.label || "",
          stock: Number(s.stock || 0),
        }));
        if (!c.name && images.length === 0 && sizes.length === 0) return null;
        return { name: c.name || "Color", hex: c.hex || "#ffffff", images, sizes };
      })
      .filter(Boolean);
  }

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newProduct.name,
        description: newProduct.description,
        category: newProduct.category,
        price: parseFloat(newProduct.price || 0),
        stock: parseInt(newProduct.stock || 0),
        imageUrl: newProduct.imageUrl || "",
      };
      const colorsBuilt = buildColorsFromAdd();
      if (colorsBuilt.length) payload.colors = colorsBuilt;
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to add product");
      }
      alert("✅ Product added successfully!");
      resetAddForm();
      setShowAddModal(false);
      fetchProducts();
    } catch (err) {
      console.error("Add product error:", err);
      alert("Failed to add product. Check console.");
    }
  };

  /* ---------------------- ORDER HELPERS ---------------------- */
  const getStatusBadge = (status) => {
    const map = {
      processing: "bg-yellow-100 text-yellow-800",
      shipped: "bg-blue-100 text-blue-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      paid: "bg-purple-100 text-purple-800",
      refunded: "bg-orange-100 text-orange-700",
      failed: "bg-gray-200 text-gray-700",
    };
    return map[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  const openStatusModal = (order) => setStatusModal({ open: true, order });

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("kokoru_admin_token");
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to update status");
      }
      alert("✅ Status updated");
      setStatusModal({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      console.error("Update status error:", err);
      alert("Failed to update status. Check console.");
    }
  };

  /* ---------------------- INVOICE/LABEL: PDF + PRINT (client-only) ---------------------- */
  const exportNodeToPdf = async (node, filename = "document.pdf", { format = "a4", margin = 8 } = {}) => {
    if (!node) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const x = margin;
    const y = margin;
    const w = pageWidth - margin * 2;
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(imgData, "PNG", x, y, w, h, undefined, "FAST");

    let heightLeft = h - (pageHeight - margin * 2);

    while (heightLeft > 0) {
      pdf.addPage();
      const position = margin - heightLeft;
      pdf.addImage(imgData, "PNG", x, position, w, h, undefined, "FAST");
      heightLeft -= pageHeight - margin * 2;
    }

    pdf.save(filename);
  };

  const printNode = async (node) => {
    const dataUrl = await (async () => {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      return canvas.toDataURL("image/png");
    })();

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return alert("Popup blocked. Please allow popups to print.");
    w.document.write(
      `<html><head><title>Print</title></head><body style="margin:0"><img src="${dataUrl}" style="width:100%"/></body></html>`
    );
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {}
    }, 300);
  };

  /* ---------------------- FILTERED ORDERS ---------------------- */
  const filteredOrders = useMemo(() => {
    const q = (filter.q || "").trim().toLowerCase();
    let arr = Array.isArray(orders) ? orders.slice() : [];
    arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (q) {
      arr = arr.filter(
        (x) =>
          (x.customerName || "").toLowerCase().includes(q) ||
          (x.userEmail || "").toLowerCase().includes(q) ||
          (x.address?.address || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [orders, filter.q]);

  /* ---------------------- CLOUDINARY UPLOAD (WITH PROGRESS) ---------------------- */
  function uploadSingleFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        reject(new Error("Cloudinary ENV missing"));
        return;
      }
      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", UPLOAD_PRESET);
      // Optional: folder
      // form.append("folder", "kokoru/products");

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && typeof onProgress === "function") {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          try {
            const res = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
              resolve(res.secure_url);
            } else {
              reject(new Error(res.error?.message || "Upload failed"));
            }
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      };
      xhr.open("POST", url);
      xhr.send(form);
    });
  }

  /** Add modal: upload files for color index `ci` */
  async function addModalUploadFiles(ci, files) {
    if (!files?.length) return;
    setAddColors((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              uploads: [
                ...c.uploads,
                ...files.map((f) => ({ name: f.name, progress: 0, status: "uploading", url: "" })),
              ],
            }
          : c
      )
    );

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      try {
        const url = await uploadSingleFileWithProgress(file, (pct) => {
          setAddColors((prev) =>
            prev.map((c, i) =>
              i === ci
                ? {
                    ...c,
                    uploads: c.uploads.map((u, j) =>
                      j === c.uploads.length - files.length + idx ? { ...u, progress: pct } : u
                    ),
                  }
                : c
            )
          );
        });

        setAddColors((prev) =>
          prev.map((c, i) =>
            i === ci
              ? {
                  ...c,
                  images: Array.from(new Set([...(c.images || []), url])),
                  uploads: c.uploads.map((u, j) =>
                    j === c.uploads.length - files.length + idx ? { ...u, progress: 100, status: "done", url } : u
                  ),
                }
              : c
          )
        );
      } catch (e) {
        console.error("Upload error", e);
        setAddColors((prev) =>
          prev.map((c, i) =>
            i === ci
              ? {
                  ...c,
                  uploads: c.uploads.map((u, j) =>
                    j === c.uploads.length - files.length + idx ? { ...u, status: "error" } : u
                  ),
                }
              : c
          )
        );
      }
    }
  }

  /** Edit modal: upload files for color index `ci` of editingProduct */
  async function editModalUploadFiles(ci, files) {
    if (!files?.length || !editingProduct) return;
    setEditingProduct((prev) => {
      const cp = { ...prev };
      cp.colors[ci].uploads = [
        ...(cp.colors[ci].uploads || []),
        ...files.map((f) => ({ name: f.name, progress: 0, status: "uploading", url: "" })),
      ];
      return cp;
    });

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      try {
        const url = await uploadSingleFileWithProgress(file, (pct) => {
          setEditingProduct((prev) => {
            const cp = { ...prev };
            const uploads = cp.colors[ci].uploads;
            const baseIndex = uploads.length - files.length;
            uploads[baseIndex + idx] = { ...uploads[baseIndex + idx], progress: pct };
            return cp;
          });
        });

        setEditingProduct((prev) => {
          const cp = { ...prev };
          cp.colors[ci].images = Array.from(new Set([...(cp.colors[ci].images || []), url]));
          const uploads = cp.colors[ci].uploads;
          const baseIndex = uploads.length - files.length;
          uploads[baseIndex + idx] = { ...uploads[baseIndex + idx], progress: 100, status: "done", url };
          return cp;
        });
      } catch (e) {
        console.error("Upload error", e);
        setEditingProduct((prev) => {
          const cp = { ...prev };
          const uploads = cp.colors[ci].uploads;
          const baseIndex = uploads.length - files.length;
          uploads[baseIndex + idx] = { ...uploads[baseIndex + idx], status: "error" };
          return cp;
        });
      }
    }
  }

  /* ---------------------- RENDER ---------------------- */
  return (
    <main className="min-h-screen bg-[#faf7ff] p-4 sm:p-6 text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-700">🌸 Kokoru Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Manage products, orders and stock</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchProducts();
              fetchOrders();
            }}
            className="px-3 py-2 bg-white border rounded shadow-sm text-sm hover:bg-gray-50"
            title="Refresh"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-800 flex items-center gap-2 shadow-md"
            title="Logout"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("products")}
                className={`px-3 py-1 rounded ${activeTab === "products" ? "bg-purple-600 text-white" : "bg-gray-100"}`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-3 py-1 rounded ${activeTab === "orders" ? "bg-purple-600 text-white" : "bg-gray-100"}`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`px-3 py-1 rounded ${activeTab === "stats" ? "bg-purple-600 text-white" : "bg-gray-100"}`}
              >
                Stats
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
            <h3 className="font-semibold text-purple-700">Quick Stats</h3>
            {!stats ? (
              <p className="text-sm text-gray-500">No data</p>
            ) : (
              <ul className="mt-3 text-sm space-y-1">
                <li>Total Products: <strong>{stats.totalProducts}</strong></li>
                <li>Total Variants: <strong>{stats.totalVariants}</strong></li>
                <li>Total Stock: <strong>{stats.totalStock}</strong></li>
                <li>Orders: <strong>{orders.length}</strong></li>
              </ul>
            )}
            <div className="mt-3">
              <button
                onClick={() => {
                  fetchProducts();
                  fetchOrders();
                }}
                className="text-sm text-purple-700 underline"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 text-sm">
            <h4 className="font-semibold text-purple-700">Stock Adjust</h4>
            <p className="text-gray-600 mt-2">Use the edit modal or quick buttons to tweak stock per variant.</p>
          </div>
        </aside>

        {/* Main */}
        <section className="col-span-3">
          {/* PRODUCTS */}
          {activeTab === "products" && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-purple-700">Products (category-wise)</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetAddForm();
                      setShowAddModal(true);
                    }}
                    className="bg-purple-600 text-white px-3 py-1 rounded"
                  >
                    + Add Product
                  </button>
                </div>
              </div>

              {loading ? (
                <p>Loading...</p>
              ) : Object.keys(grouped).length === 0 ? (
                <p className="text-gray-500">No products found</p>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-sm font-medium text-purple-800 mb-2">{category}</h3>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500">
                              <th className="p-2">Thumbnail</th>
                              <th>Name</th>
                              <th className="text-center">Price</th>
                              <th className="text-center">Variants</th>
                              <th className="text-center">Stock</th>
                              <th className="text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((p) => {
                              const thumb = getImageUrl(
                                p.colors?.[0]?.images?.[0] || p.imageUrl || "/no-image.jpg"
                              );
                              let totalStock = 0;
                              if (Array.isArray(p.colors) && p.colors.length) {
                                for (const c of p.colors)
                                  for (const s of c.sizes || [])
                                    totalStock += Number(s.stock || 0);
                              } else totalStock = Number(p.stock || 0);
                              return (
                                <tr key={p._id} className="border-b hover:bg-white">
                                  <td className="p-2 align-middle">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={thumb}
                                        alt={p.name}
                                        className="w-12 h-12 object-cover rounded"
                                      />
                                    </div>
                                  </td>
                                  <td className="align-middle font-medium">{p.name}</td>
                                  <td className="text-center align-middle">₹{p.price}</td>
                                  <td className="text-center align-middle">
                                    {p.colors?.length ? p.colors.length : 1}
                                  </td>
                                  <td className="text-center align-middle">{totalStock}</td>
                                  <td className="text-center align-middle">
                                    <button
                                      onClick={() => openEditModal(p)}
                                      className="text-sm text-blue-600 hover:underline mr-2"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteProduct(p._id)}
                                      className="text-sm text-red-600 hover:underline mr-2"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
              <h2 className="font-semibold text-lg text-purple-700">Orders (Latest first)</h2>
              <div className="flex gap-2 items-center my-3">
                <input
                  className="border p-2 rounded w-64"
                  placeholder="search name, email, address"
                  value={filter.q}
                  onChange={(e) => setFilter({ ...filter, q: e.target.value })}
                />
                <button className="text-sm text-purple-700" onClick={() => fetchOrders()}>
                  Refresh
                </button>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="p-2">Date</th>
                        <th>Customer</th>
                        <th>Address</th>
                        <th>Items</th>
                        <th className="text-center">Total</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => (
                        <tr key={o._id} className="border-b hover:bg-white">
                          <td className="p-2 align-middle text-xs text-gray-500">
                            {new Date(o.createdAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="align-middle">{o.customerName || o.userEmail}</td>
                          <td className="align-middle text-sm whitespace-pre-line text-gray-700">
                            <div className="max-w-xs break-words leading-snug">
                              <span className="block font-medium text-gray-800">
                                {o.address?.label || "Address"}
                              </span>
                              <span className="block">
                                {o.address?.address
                                  ?.split(/[,\n]+/)
                                  ?.map((line, i) => <div key={i}>{line.trim()}</div>)}
                              </span>
                            </div>
                          </td>
                          <td className="align-middle">
                            {Array.isArray(o.items)
                              ? o.items.map((it) => `${it.name} x${it.quantity}`).join(", ")
                              : ""}
                          </td>
                          <td className="text-center align-middle">₹{o.amount}</td>
                          <td className="text-center align-middle space-y-1">
                            <div
                              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                                o.status
                              )}`}
                            >
                              {o.status || "processing"}
                            </div>

                            <div className="flex flex-wrap gap-2 justify-center mt-1">
                              {/* Invoice actions */}
                              <button
                                onClick={() => setPreviewInvoice({ open: true, order: o })}
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                🧾 Invoice
                              </button>
                              {/* Shipping label actions */}
                              <button
                                onClick={() => setPreviewLabel({ open: true, order: o })}
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                🏷️ Label
                              </button>
                            </div>

                            <div className="mt-2">
                              <button
                                onClick={() => openStatusModal(o)}
                                className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                              >
                                Update Status
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STATS */}
          {activeTab === "stats" && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
              <h2 className="font-semibold text-lg text-purple-700">Dashboard</h2>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Products</div>
                    <div className="text-2xl font-bold text-purple-700">{stats.totalProducts}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Variants</div>
                    <div className="text-2xl font-bold">{stats.totalVariants}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Total Stock</div>
                    <div className="text-2xl font-bold">{stats.totalStock}</div>
                  </div>
                </div>
              ) : (
                <p>No stats</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ---------- Add Product Modal ---------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-purple-700">Add New Product</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowAddModal(false)} className="text-gray-600">
                  Close
                </button>
              </div>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Product name"
                  className="border p-2 rounded"
                  required
                />
                <input
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  placeholder="Category"
                  className="border p-2 rounded"
                  required
                />
                <input
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="Price"
                  type="number"
                  className="border p-2 rounded"
                  required
                />
                <input
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  placeholder="Stock (for simple product)"
                  type="number"
                  className="border p-2 rounded"
                />
              </div>

              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Description"
                className="w-full border p-2 rounded"
                rows={3}
              />

              <input
                value={newProduct.imageUrl}
                onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                placeholder="Main image URL (optional)"
                className="border p-2 rounded w-full"
              />

              <div>
                <h4 className="font-medium text-purple-700 mb-2">Colors & Sizes (with images)</h4>
                {addColors.map((c, ci) => (
                  <div key={ci} className="p-3 border rounded my-2 bg-gray-50 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        value={c.name}
                        onChange={(e) =>
                          setAddColors((prev) =>
                            prev.map((x, i) => (i === ci ? { ...x, name: e.target.value } : x))
                          )
                        }
                        className="border p-1 rounded w-1/3"
                        placeholder="Color name"
                      />
                      <input
                        type="color"
                        value={c.hex}
                        onChange={(e) =>
                          setAddColors((prev) =>
                            prev.map((x, i) => (i === ci ? { ...x, hex: e.target.value } : x))
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeAddColor(ci)}
                        className="text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Uploader */}
                    <div className="border rounded p-2 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Images for {c.name || "Color"}</div>
                        <label className="text-xs px-2 py-1 rounded bg-purple-600 text-white cursor-pointer">
                          Upload Images
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (!files.length) return;
                              await addModalUploadFiles(ci, files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      {/* Progress Cards */}
                      {(c.uploads || []).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          {c.uploads.map((u, i) => (
                            <div key={i} className="border rounded p-2 bg-gray-50">
                              <div className="text-xs font-medium truncate">{u.name}</div>
                              <div className="h-2 rounded bg-gray-200 mt-1 overflow-hidden">
                                <div
                                  className="h-2 bg-purple-600"
                                  style={{ width: `${u.progress || 0}%` }}
                                />
                              </div>
                              <div className="text-[11px] mt-1 text-gray-600">
                                {u.status === "done"
                                  ? "Completed"
                                  : u.status === "error"
                                  ? "Failed"
                                  : `Uploading… ${u.progress || 0}%`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Previews */}
                      <div className="flex flex-wrap gap-2">
                        {(c.images || []).map((url, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={url}
                              alt=""
                              className="w-16 h-16 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAddColors((prev) =>
                                  prev.map((x, i) =>
                                    i === ci
                                      ? { ...x, images: x.images.filter((_, j) => j !== idx) }
                                      : x
                                  )
                                )
                              }
                              className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-xs"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Paste URLs fallback */}
                      <textarea
                        value={c.urlsText}
                        onChange={(e) =>
                          setAddColors((prev) =>
                            prev.map((x, i) =>
                              i === ci ? { ...x, urlsText: e.target.value } : x
                            )
                          )
                        }
                        placeholder="Or paste image URLs (comma or newline separated)"
                        className="w-full border p-2 rounded mt-2 text-xs"
                        rows={2}
                      />
                    </div>

                    {/* Sizes */}
                    <div className="text-sm">
                      <div className="flex gap-2 items-center mb-1">
                        <div className="text-xs">Sizes:</div>
                        <button
                          type="button"
                          onClick={() => addSizeRowForAdd(ci)}
                          className="text-xs text-purple-700"
                        >
                          + Add size
                        </button>
                      </div>

                      {(c.sizes || []).map((s, si) => (
                        <div key={si} className="flex gap-2 items-center mb-1">
                          <input
                            value={s.label}
                            onChange={(e) =>
                              setAddColors((prev) =>
                                prev.map((x, i) =>
                                  i === ci
                                    ? {
                                        ...x,
                                        sizes: x.sizes.map((sz, j) =>
                                          j === si ? { ...sz, label: e.target.value } : sz
                                        ),
                                      }
                                    : x
                                )
                              )
                            }
                            placeholder="Size label"
                            className="border p-1 rounded w-1/4"
                          />
                          <input
                            value={s.stock}
                            onChange={(e) =>
                              setAddColors((prev) =>
                                prev.map((x, i) =>
                                  i === ci
                                    ? {
                                        ...x,
                                        sizes: x.sizes.map((sz, j) =>
                                          j === si
                                            ? { ...sz, stock: parseInt(e.target.value || 0) }
                                            : sz
                                        ),
                                      }
                                    : x
                                )
                              )
                            }
                            type="number"
                            placeholder="Stock"
                            className="border p-1 rounded w-20"
                          />
                          <button
                            type="button"
                            onClick={() => removeSizeRowForAdd(ci, si)}
                            className="text-red-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={addColorRow}
                    className="text-purple-700 text-sm"
                  >
                    + Add Color
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                  }}
                  className="bg-gray-200 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Edit Product Modal ---------- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-purple-700">Edit Product</h3>
              <div className="flex gap-2">
                <button onClick={() => setEditingProduct(null)} className="text-gray-600">
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={editingProduct.name || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="border p-2 rounded"
                />
                <input
                  value={editingProduct.category || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category: e.target.value })
                  }
                  className="border p-2 rounded"
                />
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: parseFloat(e.target.value || 0),
                    })
                  }
                  className="border p-2 rounded"
                />
                <input
                  type="number"
                  value={editingProduct.maxOrder || 10}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      maxOrder: parseInt(e.target.value || 0),
                    })
                  }
                  className="border p-2 rounded"
                />
              </div>

              <textarea
                value={editingProduct.description || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, description: e.target.value })
                }
                className="w-full border p-2 rounded"
                rows={3}
              />

              <div>
                <h4 className="font-medium text-purple-700">Colors & Sizes</h4>
                {(editingProduct.colors || []).map((c, ci) => (
                  <div key={ci} className="p-3 border rounded my-2 bg-gray-50 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        value={c.name || ""}
                        onChange={(e) => {
                          const cp = { ...editingProduct };
                          cp.colors[ci].name = e.target.value;
                          setEditingProduct(cp);
                        }}
                        className="border p-1 rounded w-1/3"
                      />
                      <input
                        type="color"
                        value={c.hex || "#ffffff"}
                        onChange={(e) => {
                          const cp = { ...editingProduct };
                          cp.colors[ci].hex = e.target.value;
                          setEditingProduct(cp);
                        }}
                      />
                      <button
                        onClick={() => {
                          const cp = { ...editingProduct };
                          cp.colors.splice(ci, 1);
                          setEditingProduct(cp);
                        }}
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Uploader with progress */}
                    <div className="border rounded p-2 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          Images for {c.name || `Color ${ci + 1}`}
                        </div>
                        <label className="text-xs px-2 py-1 rounded bg-purple-600 text-white cursor-pointer">
                          Upload Images
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (!files.length) return;
                              await editModalUploadFiles(ci, files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      {(c.uploads || []).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          {c.uploads.map((u, i) => (
                            <div key={i} className="border rounded p-2 bg-gray-50">
                              <div className="text-xs font-medium truncate">{u.name}</div>
                              <div className="h-2 rounded bg-gray-200 mt-1 overflow-hidden">
                                <div
                                  className="h-2 bg-purple-600"
                                  style={{ width: `${u.progress || 0}%` }}
                                />
                              </div>
                              <div className="text-[11px] mt-1 text-gray-600">
                                {u.status === "done"
                                  ? "Completed"
                                  : u.status === "error"
                                  ? "Failed"
                                  : `Uploading… ${u.progress || 0}%`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Previews */}
                      <div className="flex flex-wrap gap-2">
                        {(c.images || []).map((url, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={url}
                              alt=""
                              className="w-16 h-16 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const cp = { ...editingProduct };
                                cp.colors[ci].images = cp.colors[ci].images.filter(
                                  (_, j) => j !== idx
                                );
                                setEditingProduct(cp);
                              }}
                              className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-xs"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Paste URLs fallback */}
                      <textarea
                        value={c.urlsText || ""}
                        onChange={(e) => {
                          const cp = { ...editingProduct };
                          cp.colors[ci].urlsText = e.target.value;
                          setEditingProduct(cp);
                        }}
                        placeholder="Or paste image URLs (comma or newline separated)"
                        className="w-full border p-2 rounded mt-2 text-xs"
                        rows={2}
                      />
                    </div>

                    {/* Sizes */}
                    <div className="mt-2 text-sm">
                      <div className="flex gap-2 items-center mb-1">
                        <div className="text-xs">Sizes:</div>
                        <button
                          onClick={() => {
                            const cp = { ...editingProduct };
                            if (!cp.colors[ci].sizes) cp.colors[ci].sizes = [];
                            cp.colors[ci].sizes.push({ label: "", stock: 0 });
                            setEditingProduct(cp);
                          }}
                          className="text-xs text-purple-700"
                        >
                          + Add size
                        </button>
                      </div>

                      {(c.sizes || []).map((s, si) => (
                        <div key={si} className="flex gap-2 items-center mb-1">
                          <input
                            value={s.label || ""}
                            onChange={(e) => {
                              const cp = { ...editingProduct };
                              cp.colors[ci].sizes[si].label = e.target.value;
                              setEditingProduct(cp);
                            }}
                            className="border p-1 rounded w-1/4"
                          />
                          <input
                            type="number"
                            value={s.stock || 0}
                            readOnly
                            className="border p-1 rounded w-16 text-center bg-gray-100 text-gray-600"
                          />
                          <input
                            type="number"
                            placeholder="+Add"
                            value={s.addStock || ""}
                            onChange={(e) => {
                              const cp = { ...editingProduct };
                              cp.colors[ci].sizes[si].addStock = parseInt(e.target.value || 0);
                              setEditingProduct(cp);
                            }}
                            className="border p-1 rounded w-16 text-green-700 placeholder-green-500"
                          />
                          <span className="text-xs text-gray-700 w-12 text-center">
                            = {(s.stock || 0) + (parseInt(s.addStock) || 0)}
                          </span>
                          <button
                            onClick={() => {
                              const cp = { ...editingProduct };
                              cp.colors[ci].sizes.splice(si, 1);
                              setEditingProduct(cp);
                            }}
                            className="text-red-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const cp = { ...editingProduct };
                    if (!cp.colors) cp.colors = [];
                    cp.colors.push({ name: "", hex: "#ffffff", images: [], urlsText: "", uploads: [], sizes: [] });
                    setEditingProduct(cp);
                  }}
                  className="text-sm text-purple-700"
                >
                  + Add Color
                </button>
              </div>

              <div>
                <h4 className="font-medium text-purple-700">Simple stock (non-variant)</h4>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={editingProduct.stock || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value || 0) })
                    }
                    className="border p-1 rounded w-32"
                  />
                  <input
                    type="number"
                    placeholder="+Add"
                    value={editingProduct.addStock || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        addStock: parseInt(e.target.value || 0),
                      })
                    }
                    className="border p-1 rounded w-32"
                  />
                  <span className="text-xs text-gray-700">
                    = {(editingProduct.stock || 0) + (parseInt(editingProduct.addStock) || 0)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setEditingProduct(null);
                  }}
                  className="bg-gray-200 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditing}
                  className="bg-purple-600 text-white px-4 py-2 rounded"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Status Modal ---------- */}
      {statusModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
            <h3 className="text-lg font-semibold text-purple-700 mb-2 text-center">
              Update Order Status
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              <strong>Order ID:</strong> {statusModal.order._id}
            </p>

            <div className="mb-3 text-center">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                  statusModal.order.status
                )}`}
              >
                Current: {statusModal.order.status}
              </span>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select New Status:
            </label>
            <select
              id="statusSelect"
              defaultValue={statusModal.order.status || "processing"}
              className="border w-full rounded p-2 mb-4 focus:ring-2 focus:ring-purple-400"
            >
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStatusModal({ open: false, order: null })}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const newStatus = document.getElementById("statusSelect").value;
                  await updateOrderStatus(statusModal.order._id, newStatus);
                }}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Invoice Preview Modal ---------- */}
      {previewInvoice.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-4 w-[860px] max-w-[95vw]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-purple-700">Invoice Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    exportNodeToPdf(
                      invoiceRef.current,
                      `invoice-${previewInvoice.order?._id}.pdf`
                    )
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

            <div className="overflow-auto max-h-[80vh]">
              <div ref={invoiceRef} style={NO_TAILWIND}>
                <InvoicePreview
                  order={previewInvoice.order}
                  brand={pickBrandByCategory(previewInvoice.order)}
                  senderCityState="Kollam, Kerala"
                  supportEmail="Help@Kokaru.in"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Shipping Label Modal ---------- */}
      {previewLabel.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-4 w-[460px] max-w-[95vw]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-purple-700">Shipping Label</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    exportNodeToPdf(
                      labelRef.current,
                      `label-${previewLabel.order?._id}.pdf`,
                      { format: "a6" }
                    )
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

            <div className="overflow-auto max-h-[80vh]">
              <div ref={labelRef} style={NO_TAILWIND}>
                <ShippingLabel
                  order={previewLabel.order}
                  brandGroup={pickBrandByCategory(previewLabel.order)}
                  senderAddress="Main Office, Kokoru Brand PVT LMT, Kerala"
                  senderPhone="9113435126"
                  senderCityState="Kollam, Kerala"
                  contentCategory={pickCategoryName(previewLabel.order)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* -------- Helpers for brand/category display (editable rules) -------- */
function pickBrandByCategory(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const cats = items.map((i) => (i.category || "").toLowerCase());
  if (cats.some((c) => c.includes("jewel"))) return "Kokoru Crafts";
  if (cats.some((c) => c.includes("tea"))) return "Kokoru Crafts";
  if (cats.some((c) => c.includes("cloth") || c.includes("apparel"))) return "Kokoru Studio";
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
