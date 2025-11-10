"use client";
import { useEffect, useState, useMemo } from "react";

export default function StockManagementPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [addedStock, setAddedStock] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // ✅ Fetch all products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load stock data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ Extract unique categories
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category || "Uncategorized"))],
    [products]
  );

  // ✅ Filter logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.colors?.some((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        ) ||
        p.colors?.some((c) =>
          c.sizes?.some((s) =>
            s.label.toLowerCase().includes(search.toLowerCase())
          )
        );

      const matchCategory =
        !selectedCategory || p.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  // ✅ Handle save all
  const handleSaveAll = async () => {
    const changes = Object.entries(addedStock)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => {
        const [productId, colorName, sizeLabel] = key.split("-");
        return { productId, colorName, sizeLabel, addedStock: value };
      });

    if (changes.length === 0) {
      alert("No changes to save!");
      return;
    }

    try {
      setSaving(true);
      setSaveMessage("");
      const token = localStorage.getItem("kokoru_admin_token");

      const res = await fetch(`${API_BASE_URL}/api/stock/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ changes }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage(
          `✅ ${data.updated} stock entries updated successfully.`
        );
        setAddedStock({});
        fetchProducts(); // refresh stock data
      } else {
        setSaveMessage("❌ Failed to update stock.");
      }
    } catch (err) {
      console.error("Save error:", err);
      setSaveMessage("❌ Error saving stock updates.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">Loading stock data...</div>
    );

  return (
    <main className="p-8 bg-purple-50 min-h-screen text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-purple-800">
        🏷️ Stock Management
      </h1>

      {/* 🔍 Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search product, color, or size..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-1/3 text-sm shadow-sm focus:ring-2 focus:ring-purple-300 outline-none"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm shadow-sm bg-white w-full md:w-1/4 focus:ring-2 focus:ring-purple-300 outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearch("");
            setSelectedCategory("");
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition-all duration-150"
        >
          Reset Filters
        </button>

        <span className="ml-auto text-xs text-gray-500">
          Showing {filteredProducts.length} / {products.length} products
        </span>
      </div>

      {/* 📦 Stock Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-purple-100">
        <table className="w-full text-sm">
          <thead className="bg-purple-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-center">Category</th>
              <th className="px-4 py-3 text-center">Color</th>
              <th className="px-4 py-3 text-center">Size</th>
              <th className="px-4 py-3 text-center">Current Stock</th>
              <th className="px-4 py-3 text-center">Add Stock</th>
              <th className="px-4 py-3 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) =>
              p.colors.map((color) =>
                color.sizes.map((size, idx) => {
                  const key = `${p._id}-${color.name}-${size.label}`;
                  const added = addedStock[key] || 0;
                  return (
                    <tr
                      key={key}
                      className="border-t hover:bg-gray-50 transition duration-150"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <img
                            src={color.images?.[0] || p.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-md object-cover"
                          />
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="text-center">{p.category || "—"}</td>
                      <td className="text-center">{color.name}</td>
                      <td className="text-center">{size.label}</td>
                      <td className="text-center">{size.stock}</td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="0"
                          value={added}
                          onChange={(e) =>
                            setAddedStock({
                              ...addedStock,
                              [key]: parseInt(e.target.value || 0),
                            })
                          }
                          className="border rounded-md w-16 text-center focus:ring-2 focus:ring-purple-300 outline-none"
                        />
                      </td>
                      <td className="text-center font-semibold text-gray-700">
                        {size.stock + added}
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-medium shadow-sm text-white transition-all duration-150 ${
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {saving ? "Saving..." : "💾 Save All Changes"}
        </button>
      </div>

      {saveMessage && (
        <p className="text-center mt-4 text-sm text-gray-700">{saveMessage}</p>
      )}
    </main>
  );
}
