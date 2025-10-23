"use client";

import { useEffect, useMemo, useState } from "react";
import { getImageUrl } from "../../utils/imageHelper";
import ShareButton from "@/components/ShareButton";
import { LogOut } from "lucide-react";

/**
 * AdminPage (single-file final)
 *
 * Requirements:
 * - FRONTEND must set localStorage keys on successful admin login:
 *   - kokoru_admin_token (string JWT)
 *   - kokoru_admin_user (JSON string with { isAdmin: true, name, ... })
 *   - kokoru_admin_expiry (ms timestamp when session expires)
 *
 * - NEXT_PUBLIC_API_BASE_URL must be set in env
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function formatDate(d) {
  try {
    return new Date(d).toLocaleString("en-IN");
  } catch {
    return d;
  }
}

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

  const [addColors, setAddColors] = useState([
    { name: "", hex: "#ffffff", imageLinks: "", sizes: [{ label: "", stock: 0 }] },
  ]);

  // Orders
  const [statusModal, setStatusModal] = useState({ open: false, order: null });
  const [filter, setFilter] = useState({ q: "" });

  /* ---------------------- AUTH (client-side guard) ---------------------- */
  useEffect(() => {
    const adminToken = localStorage.getItem("kokoru_admin_token");
    const adminUser = localStorage.getItem("kokoru_admin_user");
    const expiry = localStorage.getItem("kokoru_admin_expiry");

    if (!adminToken || !adminUser) {
      // Not logged in as admin
      window.location.href = "/admin/login";
      return;
    }

    if (expiry && Date.now() > Number(expiry)) {
      // session expired
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

  /* ---------------------- FETCH ORDERS (protected) ---------------------- */
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("kokoru_admin_token");
      if (!token) {
        alert("Session expired. Please log in again.");
        window.location.href = "/admin/login";
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // unauthorized
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
    setEditingProduct(JSON.parse(JSON.stringify(product)));
    setActiveTab("products");
  };

  const saveEditing = async () => {
    if (!editingProduct || !editingProduct._id) return alert("No product loaded");
    try {
      // Apply addStock deltas
      if (Array.isArray(editingProduct.colors)) {
        editingProduct.colors.forEach((c) => {
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
        editingProduct.stock = Math.max(Number(editingProduct.stock || 0) + Number(editingProduct.addStock || 0), 0);
        delete editingProduct.addStock;
      }

      const res = await fetch(`${API_BASE_URL}/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
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
  const addColorRow = () => setAddColors((p) => [...p, { name: "", hex: "#ffffff", imageLinks: "", sizes: [{ label: "", stock: 0 }] }]);
  const removeAddColor = (i) => setAddColors((p) => p.filter((_, idx) => idx !== i));
  const addSizeRowForAdd = (ci) => setAddColors((p) => p.map((c, idx) => idx === ci ? { ...c, sizes: [...(c.sizes || []), { label: "", stock: 0 }] } : c));
  const removeSizeRowForAdd = (ci, si) => setAddColors((p) => p.map((c, idx) => idx === ci ? { ...c, sizes: (c.sizes || []).filter((_, j) => j !== si) } : c));
  const resetAddForm = () => {
    setNewProduct({ name: "", description: "", category: "", price: "", stock: 0, imageUrl: "", colors: [] });
    setAddColors([{ name: "", hex: "#ffffff", imageLinks: "", sizes: [{ label: "", stock: 0 }] }]);
  };

  function buildColorsFromAdd() {
    return addColors.map((c) => {
      const images = (c.imageLinks || "").toString().split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
      const sizes = (c.sizes || []).map(s => ({ label: s.label || "", stock: Number(s.stock || 0) }));
      if (!c.name && images.length === 0 && sizes.length === 0) return null;
      return { name: c.name || "Color", hex: c.hex || "#ffffff", images, sizes };
    }).filter(Boolean);
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

  const printInvoice = (orderId) => {
    const invoiceWindow = window.open("", "_blank", "width=900,height=1000");
    if (!invoiceWindow) {
      alert("Popup blocked. Please allow popups to print invoices.");
      return;
    }
    invoiceWindow.document.write(`<html><head><title>Generating...</title></head><body style="font-family: sans-serif;padding:40px;text-align:center"><h3>Generating invoice...</h3></body></html>`);
    invoiceWindow.document.close();

    fetch(`${API_BASE_URL}/api/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch order");
        return res.json();
      })
      .then((order) => {
        const invoiceHTML = `
          <html>
            <head>
              <title>Invoice ${order._id}</title>
              <style>
                body{font-family: Arial, Helvetica, sans-serif;color:#111;margin:36px}
                .header{border-bottom:2px solid #6b21a8;padding-bottom:12px;margin-bottom:16px}
                .brand{color:#6b21a8;font-weight:700;font-size:22px}
                table{width:100%;border-collapse:collapse;margin-top:12px}
                th,td{border:1px solid #ddd;padding:8px;text-align:left}
                th{background:#f3e8ff;color:#4b0082}
                .total{font-weight:700;text-align:right;margin-top:12px}
              </style>
            </head>
            <body>
              <div class="header"><div class="brand">Kokoru</div><div>Invoice for Order ${order._id}</div></div>
              <div><strong>Date:</strong> ${formatDate(order.createdAt)}</div>
              <div style="margin-top:12px">
                <strong>Ship To:</strong><div>${order.customerName || ""}</div>
                <div>${order.address?.address || ""}</div>
                <div><strong>Email:</strong> ${order.userEmail || "N/A"}</div>
              </div>
              <table>
                <thead><tr><th>Product</th><th>Variant</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr></thead>
                <tbody>
                  ${Array.isArray(order.items) ? order.items.map(it => `
                    <tr>
                      <td>${it.name}</td>
                      <td>${[it.colorName, it.sizeLabel].filter(Boolean).join(" / ") || "-"}</td>
                      <td>₹${it.price}</td>
                      <td>${it.quantity}</td>
                      <td>₹${(it.price * it.quantity).toFixed(2)}</td>
                    </tr>
                  `).join("") : ""}
                </tbody>
              </table>
              <div class="total">Total: ₹${Number(order.amount || 0).toFixed(2)}</div>
              <div style="margin-top:24px;text-align:center">Thank you for shopping with Kokoru 🌸</div>
              <div style="margin-top:12px;text-align:center"><button onclick="window.print()">Print</button></div>
            </body>
          </html>
        `;
        invoiceWindow.document.open();
        invoiceWindow.document.write(invoiceHTML);
        invoiceWindow.document.close();
      })
      .catch((err) => {
        console.error("Invoice error:", err);
        invoiceWindow.document.body.innerHTML = `<h3 style="color:red">Failed to load invoice</h3><p>${err.message}</p>`;
      });
  };

  /* ---------------------- STOCK ADJUST (quick helpers) ---------------------- */
  const adjustStock = async ({ productId, colorIndex = null, sizeIndex = null, delta = 0 }) => {
    try {
      const prodRes = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      if (!prodRes.ok) throw new Error("Failed to fetch product");
      const prod = await prodRes.json();

      if (colorIndex !== null && Array.isArray(prod.colors) && prod.colors[colorIndex]) {
        prod.colors[colorIndex].sizes = prod.colors[colorIndex].sizes || [];
        prod.colors[colorIndex].sizes[sizeIndex].stock = Math.max(0, Number(prod.colors[colorIndex].sizes[sizeIndex].stock || 0) + delta);
      } else {
        prod.stock = Math.max(0, Number(prod.stock || 0) + delta);
      }

      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prod),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      fetchProducts();
    } catch (err) {
      console.error("Adjust stock error:", err);
      alert("Failed to adjust stock. See console.");
    }
  };

  /* ---------------------- FILTERED ORDERS ---------------------- */
  const filteredOrders = useMemo(() => {
    const q = (filter.q || "").trim().toLowerCase();
    let arr = Array.isArray(orders) ? orders.slice() : [];
    arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (q) {
      arr = arr.filter((x) =>
        (x.customerName || "").toLowerCase().includes(q) ||
        (x.userEmail || "").toLowerCase().includes(q) ||
        (x.address?.address || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [orders, filter.q]);

  /* ---------------------- RENDER ---------------------- */
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4 sm:p-6 text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-700">🌸 Kokoru Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Manage products, orders and stock</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchProducts(); fetchOrders(); }}
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
              <button onClick={() => setActiveTab("products")} className={`px-3 py-1 rounded ${activeTab === "products" ? "bg-purple-600 text-white" : "bg-gray-100"}`}>Products</button>
              <button onClick={() => setActiveTab("orders")} className={`px-3 py-1 rounded ${activeTab === "orders" ? "bg-purple-600 text-white" : "bg-gray-100"}`}>Orders</button>
              <button onClick={() => setActiveTab("stats")} className={`px-3 py-1 rounded ${activeTab === "stats" ? "bg-purple-600 text-white" : "bg-gray-100"}`}>Stats</button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
            <h3 className="font-semibold text-purple-700">Quick Stats</h3>
            {!stats ? <p className="text-sm text-gray-500">No data</p> : (
              <ul className="mt-3 text-sm space-y-1">
                <li>Total Products: <strong>{stats.totalProducts}</strong></li>
                <li>Total Variants: <strong>{stats.totalVariants}</strong></li>
                <li>Total Stock: <strong>{stats.totalStock}</strong></li>
                <li>Orders: <strong>{orders.length}</strong></li>
              </ul>
            )}
            <div className="mt-3">
              <button onClick={() => { fetchProducts(); fetchOrders(); }} className="text-sm text-purple-700 underline">Refresh</button>
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
                  <button onClick={() => { resetAddForm(); setShowAddModal(true); }} className="bg-purple-600 text-white px-3 py-1 rounded">+ Add Product</button>
                </div>
              </div>

              {loading ? <p>Loading...</p> : (
                Object.keys(grouped).length === 0 ? (
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
                                const thumb = getImageUrl(p.colors?.[0]?.images?.[0] || p.imageUrl || "/no-image.jpg");
                                let totalStock = 0;
                                if (Array.isArray(p.colors) && p.colors.length) {
                                  for (const c of p.colors) for (const s of (c.sizes || [])) totalStock += Number(s.stock || 0);
                                } else totalStock = Number(p.stock || 0);
                                return (
                                  <tr key={p._id} className="border-b hover:bg-white">
                                    <td className="p-2 align-middle">
                                      <div className="flex items-center gap-3">
                                        <img src={thumb} alt={p.name} className="w-12 h-12 object-cover rounded" />
                                      </div>
                                    </td>
                                    <td className="align-middle font-medium">{p.name}</td>
                                    <td className="text-center align-middle">₹{p.price}</td>
                                    <td className="text-center align-middle">{(p.colors?.length) ? p.colors.length : 1}</td>
                                    <td className="text-center align-middle">{totalStock}</td>
                                    <td className="text-center align-middle">
                                      <button onClick={() => openEditModal(p)} className="text-sm text-blue-600 hover:underline mr-2">Edit</button>
                                      <button onClick={() => deleteProduct(p._id)} className="text-sm text-red-600 hover:underline mr-2">Delete</button>
                                      <ShareButton product={p} className="inline-flex items-center justify-center w-8 h-8 bg-purple-50 hover:bg-purple-100 rounded-full" />
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
                )
              )}
            </div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
              <h2 className="font-semibold text-lg text-purple-700">Orders (Latest first)</h2>
              <div className="flex gap-2 items-center my-3">
                <input className="border p-2 rounded w-64" placeholder="search name, email, address" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
                <button className="text-sm text-purple-700" onClick={() => fetchOrders()}>Refresh</button>
                <button onClick={async () => {
                  const res = await fetch(`${API_BASE_URL}/api/orders/dummy`, { method: "POST" });
                  if (res.ok) { alert("✅ Dummy order added!"); fetchOrders(); }
                  else alert("❌ Failed to create dummy order");
                }} className="text-sm text-green-700 underline ml-2">+ Dummy Order</button>
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
                            {new Date(o.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="align-middle">{o.customerName || o.userEmail}</td>
                          <td className="align-middle text-sm whitespace-pre-line text-gray-700">
                            <div className="max-w-xs break-words leading-snug">
                              <span className="block font-medium text-gray-800">{o.address?.label || "Address"}</span>
                              <span className="block">
                                {o.address?.address?.split(/[,\\n]+/)?.map((line, i) => <div key={i}>{line.trim()}</div>)}
                              </span>
                            </div>
                          </td>
                          <td className="align-middle">{Array.isArray(o.items) ? o.items.map(it => `${it.name} x${it.quantity}`).join(", ") : ""}</td>
                          <td className="text-center align-middle">₹{o.amount}</td>
                          <td className="text-center align-middle space-y-1">
                            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(o.status)}`}>
                              {o.status || "processing"}
                            </div>

                            <div>
                              <button onClick={() => openStatusModal(o)} className="mt-1 text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">Update Status</button>
                            </div>

                            <div className="flex justify-center gap-2 mt-1">
                              <button onClick={() => printInvoice(o._id)} className="text-xs flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">🖨️ Print</button>
                              <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(o, null, 2)); alert('Copied to clipboard'); }} className="text-xs flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">📋 Copy</button>
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
              ) : <p>No stats</p>}
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
                <button onClick={() => setShowAddModal(false)} className="text-gray-600">Close</button>
              </div>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product name" className="border p-2 rounded" required />
                <input value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Category" className="border p-2 rounded" required />
                <input value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="Price" type="number" className="border p-2 rounded" required />
                <input value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="Stock (for simple product)" type="number" className="border p-2 rounded" />
              </div>

              <textarea value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Description" className="w-full border p-2 rounded" rows={3} />

              <input value={newProduct.imageUrl} onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })} placeholder="Main image URL (optional)" className="border p-2 rounded w-full" />

              <div>
                <h4 className="font-medium text-purple-700 mb-2">Colors & Sizes (optional)</h4>
                {addColors.map((c, ci) => (
                  <div key={ci} className="p-3 border rounded my-2 bg-gray-50">
                    <div className="flex gap-2 items-center mb-2">
                      <input value={c.name} onChange={e => setAddColors(prev => prev.map((x, i) => i === ci ? { ...x, name: e.target.value } : x))} className="border p-1 rounded w-1/3" placeholder="Color name" />
                      <input type="color" value={c.hex} onChange={e => setAddColors(prev => prev.map((x, i) => i === ci ? { ...x, hex: e.target.value } : x))} />
                      <button type="button" onClick={() => removeAddColor(ci)} className="text-red-600">Remove</button>
                    </div>

                    <textarea placeholder="Image URLs (comma or newline separated)" value={c.imageLinks} onChange={e => setAddColors(prev => prev.map((x, i) => i === ci ? { ...x, imageLinks: e.target.value } : x))} rows={2} className="w-full border p-2 rounded mb-2" />

                    <div className="text-sm">
                      <div className="flex gap-2 items-center mb-1">
                        <div className="text-xs">Sizes:</div>
                        <button type="button" onClick={() => addSizeRowForAdd(ci)} className="text-xs text-purple-700">+ Add size</button>
                      </div>

                      {(c.sizes || []).map((s, si) => (
                        <div key={si} className="flex gap-2 items-center mb-1">
                          <input value={s.label} onChange={e => setAddColors(prev => prev.map((x, i) => i === ci ? { ...x, sizes: x.sizes.map((sz, j) => j === si ? { ...sz, label: e.target.value } : sz) } : x))} placeholder="Size label" className="border p-1 rounded w-1/4" />
                          <input value={s.stock} onChange={e => setAddColors(prev => prev.map((x, i) => i === ci ? { ...x, sizes: x.sizes.map((sz, j) => j === si ? { ...sz, stock: parseInt(e.target.value || 0) } : sz) } : x))} type="number" placeholder="Stock" className="border p-1 rounded w-20" />
                          <button type="button" onClick={() => removeSizeRowForAdd(ci, si)} className="text-red-600 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="mt-2">
                  <button type="button" onClick={addColorRow} className="text-purple-700 text-sm">+ Add Color</button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowAddModal(false); }} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">Add Product</button>
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
                <button onClick={() => setEditingProduct(null)} className="text-gray-600">Close</button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={editingProduct.name || ""} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="border p-2 rounded" />
                <input value={editingProduct.category || ""} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="border p-2 rounded" />
                <input type="number" value={editingProduct.price || 0} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value || 0) })} className="border p-2 rounded" />
                <input type="number" value={editingProduct.maxOrder || 10} onChange={e => setEditingProduct({ ...editingProduct, maxOrder: parseInt(e.target.value || 0) })} className="border p-2 rounded" />
              </div>

              <textarea value={editingProduct.description || ""} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full border p-2 rounded" rows={3} />

              <div>
                <h4 className="font-medium text-purple-700">Colors & Sizes</h4>
                {(editingProduct.colors || []).map((c, ci) => (
                  <div key={ci} className="p-3 border rounded my-2 bg-gray-50">
                    <div className="flex gap-2 items-center">
                      <input value={c.name || ""} onChange={(e) => { const cp = { ...editingProduct }; cp.colors[ci].name = e.target.value; setEditingProduct(cp); }} className="border p-1 rounded w-1/3" />
                      <input type="color" value={c.hex || "#ffffff"} onChange={(e) => { const cp = { ...editingProduct }; cp.colors[ci].hex = e.target.value; setEditingProduct(cp); }} />
                      <input value={(c.images || []).join(", ")} onChange={(e) => { const cp = { ...editingProduct }; cp.colors[ci].images = e.target.value.split(/[\n,]+/).map(x => x.trim()).filter(Boolean); setEditingProduct(cp); }} className="border p-1 rounded flex-1" />
                      <button onClick={() => { const cp = { ...editingProduct }; cp.colors.splice(ci, 1); setEditingProduct(cp); }} className="text-red-600">Remove</button>
                    </div>

                    <div className="mt-2 text-sm">
                      <div className="flex gap-2 items-center mb-1">
                        <div className="text-xs">Sizes:</div>
                        <button onClick={() => { const cp = { ...editingProduct }; if (!cp.colors[ci].sizes) cp.colors[ci].sizes = []; cp.colors[ci].sizes.push({ label: "", stock: 0 }); setEditingProduct(cp); }} className="text-xs text-purple-700">+ Add size</button>
                      </div>

                      {(c.sizes || []).map((s, si) => (
                        <div key={si} className="flex gap-2 items-center mb-1">
                          <input value={s.label || ""} onChange={(e) => { const cp = { ...editingProduct }; cp.colors[ci].sizes[si].label = e.target.value; setEditingProduct(cp); }} className="border p-1 rounded w-1/4" />
                          <input type="number" value={s.stock || 0} readOnly className="border p-1 rounded w-16 text-center bg-gray-100 text-gray-600" />
                          <input type="number" placeholder="+Add" value={s.addStock || ""} onChange={(e) => { const cp = { ...editingProduct }; cp.colors[ci].sizes[si].addStock = parseInt(e.target.value || 0); setEditingProduct(cp); }} className="border p-1 rounded w-16 text-green-700 placeholder-green-500" />
                          <span className="text-xs text-gray-700 w-12 text-center">= {(s.stock || 0) + (parseInt(s.addStock) || 0)}</span>
                          <button onClick={() => { const cp = { ...editingProduct }; cp.colors[ci].sizes.splice(si, 1); setEditingProduct(cp); }} className="text-red-600 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={() => { const cp = { ...editingProduct }; if (!cp.colors) cp.colors = []; cp.colors.push({ name: "", hex: "#ffffff", images: [], sizes: [] }); setEditingProduct(cp); }} className="text-sm text-purple-700">+ Add Color</button>
              </div>

              <div>
                <h4 className="font-medium text-purple-700">Simple stock (non-variant)</h4>
                <div className="flex gap-2 items-center">
                  <input type="number" value={editingProduct.stock || 0} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value || 0) })} className="border p-1 rounded w-32" />
                  <input type="number" placeholder="+Add" value={editingProduct.addStock || ""} onChange={e => setEditingProduct({ ...editingProduct, addStock: parseInt(e.target.value || 0) })} className="border p-1 rounded w-32" />
                  <span className="text-xs text-gray-700">= {(editingProduct.stock || 0) + (parseInt(editingProduct.addStock) || 0)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => { setEditingProduct(null); }} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                <button onClick={saveEditing} className="bg-purple-600 text-white px-4 py-2 rounded">Save changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Status Modal ---------- */}
      {statusModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
            <h3 className="text-lg font-semibold text-purple-700 mb-2 text-center">Update Order Status</h3>
            <p className="text-sm text-gray-600 mb-4 text-center"><strong>Order ID:</strong> {statusModal.order._id}</p>

            <div className="mb-3 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(statusModal.order.status)}`}>Current: {statusModal.order.status}</span>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Select New Status:</label>
            <select id="statusSelect" defaultValue={statusModal.order.status || "processing"} className="border w-full rounded p-2 mb-4 focus:ring-2 focus:ring-purple-400">
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="flex justify-end gap-3">
              <button onClick={() => setStatusModal({ open: false, order: null })} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
              <button onClick={async () => {
                const newStatus = document.getElementById("statusSelect").value;
                await updateOrderStatus(statusModal.order._id, newStatus);
              }} className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
