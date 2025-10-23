"use client";

import { useEffect, useMemo, useState } from "react";
import { getImageUrl } from "../../utils/imageHelper";
import ShareButton from "@/components/ShareButton";
import { LogOut } from "lucide-react";



/*
  AdminPage:
  - Left: Stats + Orders tab toggle
  - Right: Products table (category grouped) -> click row opens modal to edit full product
  - Add Product implemented as a Popup modal (supports colors, images per color, sizes with separate stock).
*/

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("products"); // products | orders | stats
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filter, setFilter] = useState({ q: "" });
  const [stats, setStats] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, order: null });


  // Add product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    stock: 0,
    imageUrl: "",
    colors: [], // each color: { name, hex, images (array), sizes: [{label, stock}] }
  });

  // temporary builder for colors while adding
  const [addColors, setAddColors] = useState([
    { name: "", hex: "#ffffff", imageLinks: "", sizes: [{ label: "", stock: 0 }] },
  ]);

  // fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      const data = await res.json();
      setProducts(data || []);
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoading(false);
    }
  };

  // fetch orders
// 🟣 Secure fetchOrders with token + graceful 401 handling
const fetchOrders = async () => {
  try {
    const token = localStorage.getItem("kokoru_token");
    if (!token) {
      console.warn("⚠️ No token found — redirecting to login");
      alert("Session expired. Please log in again.");
      window.location.href = "/login";
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      alert("Session expired or unauthorized. Please log in again.");
      localStorage.removeItem("kokoru_token");
      localStorage.removeItem("kokoru_user");
      window.location.href = "/login";
      return;
    }

    const data = await res.json();
    // ensure we only set array
    setOrders(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("❌ Fetch orders error:", err);
    setOrders([]); // prevent crash
  }
};
useEffect(() => {
  const token = localStorage.getItem("kokoru_admin_token");
  const user = localStorage.getItem("kokoru_admin_user");

  if (!token || !user) {
    window.location.href = "/admin/login";
  } else {
    try {
      const parsed = JSON.parse(user);
      if (parsed.username !== "admin") {
        window.location.href = "/admin/login";
      }
    } catch {
      window.location.href = "/admin/login";
    }
  }
}, []);

// 🟣 Logout function
const handleLogout = () => {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("kokoru_token");
    localStorage.removeItem("kokoru_user");
    window.location.href = "/admin/login";
  }
};

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  // compute grouped products
  const grouped = useMemo(() => {
    return products.reduce((acc, p) => {
      const cat = p.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [products]);

  // compute basic stats (stock totals)
  useEffect(() => {
    if (!products.length) return setStats(null);
    let totalProducts = products.length;
    let totalVariants = 0;
    let totalStock = 0;
    for (const p of products) {
      if (Array.isArray(p.colors) && p.colors.length) {
        for (const c of p.colors) {
          totalVariants += (c.sizes || []).length || 1;
          for (const s of (c.sizes || [])) {
            totalStock += Number(s.stock || 0);
          }
        }
      } else {
        totalVariants += 1;
        totalStock += Number(p.stock || 0);
      }
    }
    setStats({ totalProducts, totalVariants, totalStock });
  }, [products]);

  // open edit modal with deep clone
  const openEditModal = (product) => {
    // clone to avoid mutating list before save
    setEditingProduct(JSON.parse(JSON.stringify(product)));
    setActiveTab("products");
  };

  // save edits
  const saveEditing = async () => {
    if (!editingProduct || !editingProduct._id) return alert("No product loaded");
    try {
      // Apply addStock deltas into sizes before sending:
      if (Array.isArray(editingProduct.colors)) {
        for (const c of editingProduct.colors) {
          if (Array.isArray(c.sizes)) {
            for (const s of c.sizes) {
              if (s.addStock) {
                s.stock = Math.max(Number(s.stock || 0) + Number(s.addStock || 0), 0);
                delete s.addStock;
              }
            }
          }
        }
      }
      // For simple product, if there's addStock on root, apply it
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
        const err = await res.json();
        throw new Error(err.message || "Update failed");
      }
      alert("Product updated");
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("Save edit error:", err);
      alert("Failed to save product. See console.");
    }
  };

  // add stock helper: increments a specific size stock (kept for admin quick actions outside edit modal)
  const adjustStock = async ({ productId, colorIndex, sizeIndex, delta }) => {
    try {
      const prod = await (await fetch(`${API_BASE_URL}/api/products/${productId}`)).json();
      if (colorIndex != null) {
        prod.colors = prod.colors || [];
        prod.colors[colorIndex].sizes[sizeIndex].stock = Math.max(
          0,
          Number(prod.colors[colorIndex].sizes[sizeIndex].stock || 0) + delta
        );
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
      alert("Failed to adjust stock. Check console.");
    }
  };

  // Print Invoice (popup-first approach)
  const printInvoice = (orderId) => {
    const invoiceWindow = window.open("", "_blank", "width=900,height=1000");

    if (!invoiceWindow || invoiceWindow.closed || typeof invoiceWindow.closed === "undefined") {
      alert("⚠️ Popup blocked. Please allow pop-ups for this site to print invoices.");
      return;
    }

    invoiceWindow.document.write(`
      <html><head><title>Generating Invoice...</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h2>🧾 Generating your invoice...</h2>
        <p>Please wait a moment.</p>
      </body></html>
    `);
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
              <title>Invoice - ${order._id}</title>
              <style>
                body { font-family: Arial, Helvetica, sans-serif; margin: 40px; color: #111; }
                .header { text-align: center; border-bottom: 2px solid #6b21a8; padding-bottom: 10px; margin-bottom: 20px; }
                .brand { font-size: 26px; font-weight: bold; color: #6b21a8; }
                .meta, .section { margin-bottom: 20px; }
                .meta div { margin: 3px 0; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; text-align: left; }
                th { background: #f3e8ff; color: #4b0082; }
                .total { font-weight: bold; font-size: 16px; text-align: right; padding-top: 10px; }
                .footer { text-align: center; margin-top: 40px; font-size: 13px; color: #555; }
                .address-box { border: 1px solid #ccc; border-radius: 6px; padding: 12px; line-height: 1.4; }
                .company { text-align: right; font-size: 12px; color: #777; }
                .two-col { display:flex; justify-content:space-between; gap:16px; }
                .two-col > div { flex:1; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="brand">Kokoru</div>
                <div style="font-size:14px;">Elegant & Handmade with Love 🌸</div>
              </div>

              <div class="two-col">
                <div>
                  <div class="meta">
                    <div><strong>Order ID:</strong> ${order._id}</div>
                    <div><strong>Payment ID:</strong> ${order.paymentId || "N/A"}</div>
                    <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
                    <div><strong>Status:</strong> ${order.status}</div>
                  </div>
                </div>
                <div class="company">
                  <div><strong>Kokoru Lifestyle Pvt. Ltd.</strong></div>
                  <div>123 Blossom Street, Chandrapur, MH</div>
                  <div>Email: support@kokoru.in</div>
                  <div>Phone: +91-9876543210</div>
                </div>
              </div>

              <div class="section">
                <h3>Shipping Address</h3>
                <div class="address-box">
                  <div><strong>${order.customerName || "Customer"}</strong></div>
                  <div>${order.address?.address || ""}</div>
                  <div><strong>Email:</strong> ${order.userEmail || "N/A"}</div>
                  ${order.contact ? `<div><strong>Contact:</strong> ${order.contact}</div>` : ""}
                </div>
              </div>

              <div class="section">
                <h3>Items</h3>
                <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.items.map(it => `
                      <tr>
                        <td>${it.name}</td>
                        <td>${[it.colorName, it.sizeLabel].filter(Boolean).join(" / ") || "-"}</td>
                        <td>₹${it.price}</td>
                        <td>${it.quantity}</td>
                        <td>₹${(it.price * it.quantity).toFixed(2)}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
                </div>
                <div class="total">Total Amount: ₹${Number(order.amount).toFixed(2)}</div>
              </div>

              <div class="footer">
                <p>Thank you for shopping with <strong>Kokoru</strong> 🌸</p>
                <p>This invoice is auto-generated and valid for tax purposes.</p>
                <button onclick="window.print()">🖨️ Print</button>
              </div>
            </body>
          </html>
        `;

        invoiceWindow.document.open();
        invoiceWindow.document.write(invoiceHTML);
        invoiceWindow.document.close();
      })
      .catch((err) => {
        console.error("Invoice error:", err);
        invoiceWindow.document.body.innerHTML = `
          <h3 style='color:red;'>❌ Failed to load invoice.</h3>
          <p>${err.message}</p>`;
      });
  };

  // delete product (existing)
  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/products/${id}`, { method: "DELETE" });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  // Filtered orders view - newest first
  const filteredOrders = useMemo(() => {
    const q = (filter.q || "").trim().toLowerCase();
    let o = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (q) {
      o = o.filter(x =>
        (x.customerName || "").toLowerCase().includes(q) ||
        (x.userEmail || "").toLowerCase().includes(q) ||
        (x.address?.address || "").toLowerCase().includes(q)
      );
    }
    return o;
  }, [orders, filter.q]);

  /* ---------------------------
     Add Product modal helpers
     --------------------------- */
  const addColorRow = () =>
    setAddColors(prev => [...prev, { name: "", hex: "#ffffff", imageLinks: "", sizes: [{ label: "", stock: 0 }] }]);

  const removeAddColor = (index) => setAddColors(prev => prev.filter((_, i) => i !== index));

  const addSizeRowForAdd = (colorIndex) =>
    setAddColors(prev => prev.map((c, i) =>
      i === colorIndex ? { ...c, sizes: [...(c.sizes || []), { label: "", stock: 0 }] } : c
    ));

  const removeSizeRowForAdd = (colorIndex, sizeIndex) =>
    setAddColors(prev => prev.map((c, i) =>
      i === colorIndex ? { ...c, sizes: (c.sizes || []).filter((_, j) => j !== sizeIndex) } : c
    ));

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
    setAddColors([{ name: "", hex: "#ffffff", imageLinks: "", sizes: [{ label: "", stock: 0 }] }]);
  };

  // Build color objects from addColors temporary representation
  function buildColorsFromAdd() {
    const colors = addColors
      .map(c => {
        const images = (c.imageLinks || "")
          .toString()
          .split(/[\n,]+/)
          .map(x => x.trim())
          .filter(Boolean);
        const sizes = (c.sizes || []).map(s => ({ label: (s.label || "").toString(), stock: Number(s.stock || 0) }));
        // If color has no useful data, skip it (allows simple product)
        if (!c.name && images.length === 0 && sizes.length === 0) return null;
        return {
          name: c.name || "Color",
          hex: c.hex || "#ffffff",
          images,
          sizes,
        };
      })
      .filter(Boolean);
    return colors;
  }

  // Submit new product
  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build product payload
      const payload = {
        name: newProduct.name,
        description: newProduct.description,
        category: newProduct.category,
        price: parseFloat(newProduct.price || 0),
        stock: parseInt(newProduct.stock || 0),
        imageUrl: newProduct.imageUrl || "",
      };

      const colorsBuilt = buildColorsFromAdd();
      if (colorsBuilt.length > 0) payload.colors = colorsBuilt;
      // If colors empty, backend expects simple product with stock - leave out colors

      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Add product failed", err);
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

  return (
<main className="min-h-screen bg-gradient-to-b from-purple-50 to-white text-gray-800 p-3 sm:p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">Admin Dashboard</h1>
        {/* 🟣 Logout Button */}
      <div className="absolute top-5 right-6">
          <button
            onClick={handleLogout}
            className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-800 transition flex items-center gap-2 shadow-md"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* left column: tabs & stats */}
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
            <p className="text-gray-600 mt-2">You can adjust stock per variant from inside product Edit modal (click a product row). Use Save Changes to apply add-stock values.</p>
          </div>
        </aside>

        {/* main area */}
        <section className="col-span-3">
          {/* Products Table */}
          {activeTab === "products" && (
<div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-purple-700">Products (category-wise)</h2>
                <div>
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
                            {items.map(p => {
                              // thumbnail
                              const thumb = getImageUrl(p.colors?.[0]?.images?.[0] || p.imageUrl || "/no-image.jpg");
                              // compute total stock
                              let totalStock = 0;
                              if (Array.isArray(p.colors) && p.colors.length) {
                                for (const c of p.colors) {
                                  for (const s of (c.sizes || [])) totalStock += Number(s.stock || 0);
                                }
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
                                    <button onClick={() => deleteProduct(p._id)} className="text-sm text-red-600 hover:underline">Delete</button>
                                    {/* 📤 Share Button */}
                                    <ShareButton
                                      product={p}
                                      className="inline-flex items-center justify-center w-8 h-8 bg-purple-50 hover:bg-purple-100 rounded-full"
                                    />
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

          {/* Orders Table */}
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
                    {filteredOrders.map(o => (
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
                                ?.split(/[,\\n]+/)
                                .map((line, i) => (
                                  <div key={i}>{line.trim()}</div>
                                ))}
                            </span>
                          </div>
                        </td>
                        <td className="align-middle">{o.items?.map(it => `${it.name} x${it.quantity}`).join(", ")}</td>
                        <td className="text-center align-middle">₹{o.amount}</td>
<td className="text-center align-middle space-y-1">
  {/* 🟣 Current Status Badge */}
  <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(o.status)}`}>
    {o.status || "processing"}
  </div>

  {/* 🟢 Update Status Button */}
  <div>
    <button
      onClick={() => setStatusModal({ open: true, order: o })}
      className="mt-1 text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition"
    >
      Update Status
    </button>
  </div>

  {/* 🖨️ Print & Copy Buttons */}
  <div className="flex justify-center gap-2 mt-1">
    <button
      onClick={() => printInvoice(o._id)}
      className="text-xs flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
      title="Print Invoice"
    >
      🖨️ <span>Print</span>
    </button>
    <button
      onClick={() => {
        navigator.clipboard?.writeText(JSON.stringify(o, null, 2));
        alert('Copied to clipboard');
      }}
      className="text-xs flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
      title="Copy Order Details"
    >
      📋 <span>Copy</span>
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

          {/* Stats tab */}
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

      {/* ------------- Add Product Modal (POPUP) ------------- */}
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

      {/* Edit modal */}
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
                <input type="number" value={editingProduct.price || 0} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="border p-2 rounded" />
                <input type="number" value={editingProduct.maxOrder || 10} onChange={e => setEditingProduct({ ...editingProduct, maxOrder: parseInt(e.target.value) })} className="border p-2 rounded" />
              </div>

              <textarea value={editingProduct.description || ""} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full border p-2 rounded" rows={3} />

              {/* Colors editor */}
              <div>
                <h4 className="font-medium text-purple-700">Colors & Sizes</h4>
                {(editingProduct.colors || []).map((c, ci) => (
                  <div key={ci} className="p-3 border rounded my-2 bg-gray-50">
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
                      <input
                        value={(c.images || []).join(", ")}
                        onChange={(e) => {
                          const cp = { ...editingProduct };
                          cp.colors[ci].images = e.target.value
                            .split(/[\n,]+/)
                            .map((x) => x.trim())
                            .filter(Boolean);
                          setEditingProduct(cp);
                        }}
                        className="border p-1 rounded flex-1"
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

                    {/* Size Section */}
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
                          {/* Size Label */}
                          <input
                            value={s.label || ""}
                            onChange={(e) => {
                              const cp = { ...editingProduct };
                              cp.colors[ci].sizes[si].label = e.target.value;
                              setEditingProduct(cp);
                            }}
                            className="border p-1 rounded w-1/4"
                          />

                          {/* Current Stock (read-only) */}
                          <input
                            type="number"
                            value={s.stock || 0}
                            readOnly
                            className="border p-1 rounded w-16 text-center bg-gray-100 text-gray-600"
                            title="Current Stock"
                          />

                          {/* Add Stock (temporary input) */}
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
                            title="Add Stock (not saved until you click Save Changes)"
                          />

                          {/* Total (preview only) */}
                          <span className="text-xs text-gray-700 w-12 text-center">
                            = {(s.stock || 0) + (parseInt(s.addStock) || 0)}
                          </span>

                          {/* Delete Button */}
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
                <button onClick={() => {
                  const cp = { ...editingProduct };
                  if (!cp.colors) cp.colors = [];
                  cp.colors.push({ name: "", hex: "#ffffff", images: [], sizes: [] });
                  setEditingProduct(cp);
                }} className="text-sm text-purple-700">+ Add Color</button>
              </div>

              {/* fallback for non-variant products */}
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
{statusModal.open && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
      <h3 className="text-lg font-semibold text-purple-700 mb-2 text-center">
        Update Order Status
      </h3>
      <p className="text-sm text-gray-600 mb-4 text-center">
        <strong>Order ID:</strong> {statusModal.order._id}
      </p>

      {/* 🟣 Current Status */}
      <div className="mb-3 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(statusModal.order.status)}`}>
          Current: {statusModal.order.status}
        </span>
      </div>

      {/* 🟢 Select New Status */}
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
      </select>

      {/* 🟣 Buttons */}
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
            const res = await fetch(`${API_BASE_URL}/api/orders/${statusModal.order._id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
              alert(`✅ Status updated to ${newStatus}`);
              setStatusModal({ open: false, order: null });
              fetchOrders();
            } else {
              alert("❌ Failed to update status");
            }
          }}
          className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
{/* 📱 Floating Action Bar (Android optimized) */}
<div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border border-purple-200 shadow-lg rounded-full flex justify-around items-center py-3 sm:hidden">
  <button
    onClick={() => {
      resetAddForm();
      setShowAddModal(true);
    }}
    className="flex flex-col items-center text-purple-700 hover:text-purple-900 text-sm"
  >
    <span className="text-2xl leading-none">➕</span>
    Add Product
  </button>

  <ShareButton
    product={{
      name: "Kokoru Store",
      description: "Explore our new handmade collection 🌸",
      imageUrl: "/no-image.jpg",
      _id: "",
    }}
    className="flex flex-col items-center text-purple-700 hover:text-purple-900 text-sm"
  />
</div>

    </main>
  );
}
