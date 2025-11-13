"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getImageUrl } from "@/utils/imageHelper";
import { Plus, Trash2, UploadCloud, Edit, RefreshCcw } from "lucide-react";

/* env */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/* ---------- Helper: upload to Cloudinary ---------- */
const uploadFileToCloudinary = (file, onProgress) =>
  new Promise((resolve, reject) => {
    if (!file) return reject("No file");
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url || res.url);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(xhr.responseText || "Upload failed");
        }
      }
    };

    xhr.open("POST", url);
    xhr.send(fd);
  });

/* ---------- Component ---------- */
export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const emptyProduct = {
    name: "",
    category: "",
    description: "",
    price: 0,
    ourPrice: 0,
    discount: 0,
    mrp: 0,
    imageUrl: "",
    stock: 0,
    sizes: [],
    colors: [
      // default single color placeholder on new product
      { name: "Default", hex: "#ffffff", images: [], sizes: [{ label: "M", stock: 0 }] },
    ],
    allowCOD: true,
    allowReturn: true,
    allowExchange: true,
    offerTitle: "",
    offerText: "",
    maxOrder: 10,
  };

  const [editingProduct, setEditingProduct] = useState(null);
  const [draft, setDraft] = useState(emptyProduct);
  const [newCategories, setNewCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const categories = useMemo(() => {
    const fromProducts = products.map((p) => p.category).filter(Boolean);
    return [...new Set([...fromProducts, ...newCategories])];
  }, [products, newCategories]);

  /* ---------- fetch products ---------- */
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch products", err);
      alert("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ---------- helpers to mutate draft ---------- */
  const setDraftField = (path, value) => {
    // simple path setter: "name" or "colors.0.name" etc.
    if (!path.includes(".")) {
      setDraft((d) => ({ ...d, [path]: value }));
      return;
    }
    const parts = path.split(".");
    setDraft((d) => {
      const copy = JSON.parse(JSON.stringify(d));
      let cur = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = isNaN(parts[i]) ? parts[i] : +parts[i];
        cur = cur[p];
      }
      const last = parts[parts.length - 1];
      cur[last] = value;
      return copy;
    });
  };

  /* ---------- modal open/close ---------- */
  const openCreateModal = () => {
    setEditingProduct(null);
    setDraft(emptyProduct);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    // create deep copy and normalize shapes
    const p = JSON.parse(JSON.stringify(product || emptyProduct));
    // ensure colors structure exists
    if (!Array.isArray(p.colors) || p.colors.length === 0) {
      p.colors = [{ name: "Default", hex: "#ffffff", images: p.imageUrl ? [p.imageUrl] : [], sizes: [] }];
    }
    setEditingProduct(product);
    setDraft(p);
    setShowModal(true);
  };

  /* ---------- color & size operations ---------- */
  const addColor = () => {
    setDraft((d) => ({ ...d, colors: [...(d.colors || []), { name: "New", hex: "#ffffff", images: [], sizes: [] }] }));
  };
  const removeColor = (index) => {
    if (!confirm("Remove this color variant?")) return;
    setDraft((d) => ({ ...d, colors: d.colors.filter((_, i) => i !== index) }));
  };
  const addSizeToColor = (colorIndex) => {
    setDraft((d) => {
      const copy = JSON.parse(JSON.stringify(d));
      copy.colors[colorIndex].sizes = copy.colors[colorIndex].sizes || [];
      copy.colors[colorIndex].sizes.push({ label: "New", stock: 0 });
      return copy;
    });
  };
  const removeSizeFromColor = (colorIndex, sizeIndex) => {
    setDraft((d) => {
      const copy = JSON.parse(JSON.stringify(d));
      copy.colors[colorIndex].sizes.splice(sizeIndex, 1);
      return copy;
    });
  };

  /* ---------- image upload (per color) ---------- */
  const handleImageUpload = async (colorIndex, file) => {
    if (!file) return;
    setUploadProgress(0);
    try {
      const url = await uploadFileToCloudinary(file, (p) => setUploadProgress(p));
      setDraft((d) => {
        const copy = JSON.parse(JSON.stringify(d));
        copy.colors[colorIndex].images = copy.colors[colorIndex].images || [];
        copy.colors[colorIndex].images.push(url);
        return copy;
      });
      setUploadProgress(0);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Image upload failed");
      setUploadProgress(0);
    }
  };

  const removeImageFromColor = (colorIndex, imgIndex) => {
    if (!confirm("Remove this image?")) return;
    setDraft((d) => {
      const copy = JSON.parse(JSON.stringify(d));
      copy.colors[colorIndex].images.splice(imgIndex, 1);
      return copy;
    });
  };

  /* ---------- delete product ---------- */
  const deleteProduct = async (id) => {
    if (!confirm("Delete this product permanently?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchProducts();
    } catch (err) {
      console.error("Delete product failed", err);
      alert("Failed to delete product");
    }
  };

  /* ---------- save (create/update) ---------- */
  const saveProduct = async () => {
    setSaving(true);
    try {
      // normalize numeric fields
      const payload = JSON.parse(JSON.stringify(draft));
      payload.price = Number(payload.price || 0);
      payload.ourPrice = Number(payload.ourPrice || payload.price || 0);
      payload.discount = Number(payload.discount || 0);
      payload.mrp = Number(payload.mrp || payload.mrp || payload.price || 0);
      payload.stock = Number(payload.stock || 0);
      payload.maxOrder = Number(payload.maxOrder || 10);

      // if no colors, create default
      if (!Array.isArray(payload.colors) || payload.colors.length === 0) {
        payload.colors = [
          {
            name: "Default",
            hex: "#ffffff",
            images: payload.imageUrl ? [payload.imageUrl] : [],
            sizes: [],
          },
        ];
      }

      // choose endpoint + method
      const method = editingProduct ? "PUT" : "POST";
      const url = editingProduct ? `${API_BASE_URL}/api/products/${editingProduct._id}` : `${API_BASE_URL}/api/products`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Save product failed", text);
        throw new Error("Save failed");
      }
      // success
      setShowModal(false);
      setEditingProduct(null);
      setDraft(emptyProduct);
      await fetchProducts();
      alert("Product saved");
    } catch (err) {
      console.error("Save product error", err);
      alert("Failed to save product");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  /* ---------- grouped view ---------- */
  const grouped = useMemo(() => {
    return products.reduce((acc, p) => {
      const cat = p.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [products]);

  /* ---------- UI ---------- */
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product inventory and catalog</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchProducts()} 
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <button 
            onClick={openCreateModal} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {loadingProducts ? (
        <p>Loading...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500">No products found</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-lg font-semibold text-purple-600 mb-2">{cat}</h2>
            <div className="bg-white rounded-lg shadow-sm border border-purple-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-2 text-left">Image</th>
                    <th className="text-left">Name</th>
                    <th className="text-center">Price</th>
                    <th className="text-center">Variants</th>
                    <th className="text-center">Stock</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const thumb = getImageUrl(p.colors?.[0]?.images?.[0] || p.imageUrl);
                    let totalStock = 0;
                    if (Array.isArray(p.colors))
                      for (const c of p.colors) for (const s of c.sizes || []) totalStock += Number(s.stock || 0);
                    else totalStock = Number(p.stock || 0);

                    return (
                      <tr key={p._id} className="border-t hover:bg-gray-50">
                        <td className="p-2">
                          <img src={thumb} alt="" className="w-12 h-12 object-cover rounded" />
                        </td>
                        <td>
                          <Link href={`/product/${p._id}`} className="text-purple-700 hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td className="text-center">₹{p.ourPrice ?? p.price}</td>
                        <td className="text-center">{p.colors?.length || 1}</td>
                        <td className="text-center">{totalStock}</td>
                        <td className="text-center">
                          <button onClick={() => openEditModal(p)} className="text-blue-600 hover:underline mr-2"><Edit size={14} /> Edit</button>
                          <button onClick={() => deleteProduct(p._id)} className="text-red-600 hover:underline"><Trash2 size={14} /> Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* ---------- Modal: add / edit ---------- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40 overflow-auto">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-700">{editingProduct ? "Edit Product" : "Add Product"}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setDraft(emptyProduct);
                    setEditingProduct(null);
                  }}
                  className="px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input value={draft.name} onChange={(e) => setDraftField("name", e.target.value)} className="w-full border rounded px-3 py-2" />

                <label className="text-sm font-medium mt-3 block">Category</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={draft.category}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__add_new__") {
                        setShowAddCategory(true);
                        setDraftField("category", "");
                      } else {
                        setDraftField("category", v);
                        setShowAddCategory(false);
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__add_new__">+ Add new category...</option>
                  </select>

                  <button type="button" onClick={() => setShowAddCategory((s) => !s)} className="px-3 py-2 bg-gray-100 rounded">
                    + Add
                  </button>
                </div>

                {showAddCategory && (
                  <div className="mt-2 flex gap-2">
                    <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="w-full border rounded px-3 py-2" />
                    <button
                      type="button"
                      onClick={() => {
                        const name = newCategoryName.trim();
                        if (!name) return alert("Enter a category name");
                        setNewCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
                        setDraftField("category", name);
                        setNewCategoryName("");
                        setShowAddCategory(false);
                      }}
                      className="px-3 py-2 bg-purple-600 text-white rounded"
                    >
                      Create
                    </button>
                  </div>
                )}

                <label className="text-sm font-medium mt-3 block">Description</label>
                <textarea value={draft.description} onChange={(e) => setDraftField("description", e.target.value)} className="w-full border rounded px-3 py-2" rows={4} />
              </div>

              <div>
                <label className="text-sm font-medium">Price (legacy)</label>
                <input type="number" value={draft.price} onChange={(e) => setDraftField("price", e.target.value)} className="w-full border rounded px-3 py-2" />

                <div className="flex gap-2 mt-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Our Price</label>
                    <input type="number" value={draft.ourPrice} onChange={(e) => setDraftField("ourPrice", e.target.value)} className="w-full border rounded px-3 py-2" />
                  </div>
                  <div className="w-28">
                    <label className="text-sm font-medium">Discount %</label>
                    <input type="number" value={draft.discount} onChange={(e) => setDraftField("discount", e.target.value)} className="w-full border rounded px-3 py-2" />
                  </div>
                </div>

                <label className="text-sm font-medium mt-3 block">MRP (optional)</label>
                <input type="number" value={draft.mrp} onChange={(e) => setDraftField("mrp", e.target.value)} className="w-full border rounded px-3 py-2" />

                <label className="text-sm font-medium mt-3 block">Max Order</label>
                <input type="number" value={draft.maxOrder} onChange={(e) => setDraftField("maxOrder", e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            {/* Colors editor */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Color Variants</h4>
                <button onClick={addColor} className="text-sm px-3 py-1 bg-gray-100 rounded flex items-center gap-2"><Plus size={14} /> Add Color</button>
              </div>

              <div className="space-y-4">
                {draft.colors?.map((c, ci) => (
                  <div key={ci} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input value={c.name} onChange={(e) => setDraftField(`colors.${ci}.name`, e.target.value)} className="border px-2 py-1 rounded" />
                        <input type="color" value={c.hex || "#ffffff"} onChange={(e) => setDraftField(`colors.${ci}.hex`, e.target.value)} className="w-10 h-8 p-0 border-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeColor(ci)} className="text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>

                    {/* images */}
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs text-gray-600">Images</label>
                        <div className="text-xs text-gray-400"> (upload per image)</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(c.images || []).map((img, ii) => (
                          <div key={ii} className="relative w-20 h-20 rounded overflow-hidden border">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => removeImageFromColor(ci, ii)} className="absolute top-1 right-1 bg-white/80 rounded p-0.5 text-xs">x</button>
                          </div>
                        ))}

                        <div className="flex items-center gap-2">
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(ci, e.target.files?.[0])} />
                          {uploadProgress > 0 && <div className="text-xs text-gray-600">Uploading: {uploadProgress}%</div>}
                        </div>
                      </div>
                    </div>

                    {/* sizes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Sizes</div>
                        <button onClick={() => addSizeToColor(ci)} className="text-sm bg-gray-100 px-2 py-1 rounded">+ Size</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {(c.sizes || []).map((sz, si) => (
                          <div key={si} className="flex items-center gap-2 border rounded p-2 bg-white">
                            <input value={sz.label} onChange={(e) => setDraftField(`colors.${ci}.sizes.${si}.label`, e.target.value)} className="w-20 border rounded px-2 py-1" />
                            <input type="number" value={sz.stock} onChange={(e) => setDraftField(`colors.${ci}.sizes.${si}.stock`, Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
                            <button onClick={() => removeSizeFromColor(ci, si)} className="text-red-500"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* flags & offers */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm block">Allow COD</label>
                <input type="checkbox" checked={!!draft.allowCOD} onChange={(e) => setDraftField("allowCOD", e.target.checked)} />
              </div>
              <div>
                <label className="text-sm block">Allow Return</label>
                <input type="checkbox" checked={!!draft.allowReturn} onChange={(e) => setDraftField("allowReturn", e.target.checked)} />
              </div>
              <div>
                <label className="text-sm block">Allow Exchange</label>
                <input type="checkbox" checked={!!draft.allowExchange} onChange={(e) => setDraftField("allowExchange", e.target.checked)} />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm block">Offer Title</label>
                <input value={draft.offerTitle} onChange={(e) => setDraftField("offerTitle", e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm block">Offer Text</label>
                <input value={draft.offerText} onChange={(e) => setDraftField("offerText", e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            {/* actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setEditingProduct(null); setDraft(emptyProduct); }} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={saveProduct} disabled={saving} className="px-4 py-2 rounded bg-purple-600 text-white">
                {saving ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
