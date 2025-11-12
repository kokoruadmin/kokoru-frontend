"use client";
import { useEffect, useState } from "react";
import { Trash2, Star } from "lucide-react";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [categoryStats, setCategoryStats] = useState([]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // 🟣 Fetch Reviews (and compute analytics)
  const fetchReviews = async () => {
    try {
      const token =
        localStorage.getItem("kokoru_admin_token") ||
        localStorage.getItem("kokoru_token") ||
        localStorage.getItem("kokoru_user_token");

      if (!token) {
        console.error("⚠️ No admin token found. Please log in.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/reviews`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log("📦 Reviews API Response:", data);

      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
        computeAnalytics(data.reviews);
      } else {
        console.error("Failed to load reviews");
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🧮 Compute Analytics (average rating + category breakdown)
  const computeAnalytics = (allReviews) => {
    if (!Array.isArray(allReviews) || allReviews.length === 0) {
      setStats({ avg: 0, count: 0 });
      setCategoryStats([]);
      return;
    }

    const totalCount = allReviews.length;
    const avg =
      allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
      (totalCount || 1);

    const grouped = {};
    allReviews.forEach((r) => {
      const cat = r.productId?.category || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    });

    const catStats = Object.entries(grouped).map(([cat, arr]) => ({
      category: cat,
      count: arr.length,
      avg:
        arr.reduce((sum, r) => sum + (r.rating || 0), 0) / arr.length || 0,
    }));

    setStats({ avg: avg || 0, count: totalCount });
    setCategoryStats(catStats);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const token =
        localStorage.getItem("kokoru_admin_token") ||
        localStorage.getItem("kokoru_token");

      const res = await fetch(`${API_BASE_URL}/api/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        const updated = reviews.filter((r) => r._id !== id);
        setReviews(updated);
        computeAnalytics(updated);
      } else {
        alert(data.message || "Failed to delete review");
      }
    } catch (err) {
      alert("Error deleting review");
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const categories = [
    ...new Set(reviews.map((r) => r.productId?.category?.trim()).filter(Boolean)),
  ];

  const productsInCategory = reviews
    .filter((r) => !selectedCategory || r.productId?.category === selectedCategory)
    .map((r) => ({
      id: r.productId?._id,
      name: r.productId?.name,
    }))
    .filter(
      (v, i, arr) => v.id && arr.findIndex((x) => x.id === v.id) === i
    );

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      r.comment?.toLowerCase().includes(search.toLowerCase()) ||
      r.productId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || r.productId?.category === selectedCategory;
    const matchesProduct = !selectedProduct || r.productId?._id === selectedProduct;
    return matchesSearch && matchesCategory && matchesProduct;
  });

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading reviews...</div>;

  return (
    <main className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="text-gray-600 mt-1">Monitor customer feedback and manage reviews</p>
      </div>

      {/* 🔹 Analytics Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            ⭐ Average Rating
          </h2>
          <div className="text-4xl font-bold text-purple-700">
            {stats.avg.toFixed(1)}
          </div>
          <div className="flex justify-center mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={18}
                className={
                  i < Math.round(stats.avg)
                    ? "text-yellow-400"
                    : "text-gray-300"
                }
              />
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            💬 Total Reviews
          </h2>
          <div className="text-4xl font-bold text-purple-700">
            {stats.count}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            📦 Categories
          </h2>
          <div className="text-4xl font-bold text-purple-700">
            {categoryStats.length}
          </div>
        </div>
      </div>

      {/* 🔹 Category Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Category-wise Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-purple-100 text-gray-700">
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-center">Reviews Count</th>
                <th className="p-3 text-center">Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((c) => (
                <tr key={c.category} className="border-t">
                  <td className="p-3">{c.category}</td>
                  <td className="p-3 text-center">{c.count}</td>
                  <td className="p-3 text-center">{c.avg.toFixed(1)} ⭐</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 shadow-sm flex-1 min-w-[250px]"
        />

        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedProduct("");
          }}
          className="border rounded-lg px-4 py-2 shadow-sm bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="border rounded-lg px-4 py-2 shadow-sm bg-white"
          disabled={!selectedCategory}
        >
          <option value="">All Products</option>
          {productsInCategory.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button
          onClick={fetchReviews}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Refresh
        </button>
      </div>

      {/* 🔹 Reviews Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
        <table className="w-full text-sm">
          <thead className="bg-purple-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-center">Rating</th>
              <th className="px-4 py-3 text-left">Comment</th>
              <th className="px-4 py-3 text-center">Date</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.map((r) => (
              <tr key={r._id} className="border-t hover:bg-gray-50 transition duration-150">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.userName || "Guest"}</div>
                  <div className="text-xs text-gray-500">{r.userEmail}</div>
                </td>
                <td className="px-4 py-3">{r.productId?.category || "—"}</td>
                <td className="px-4 py-3">{r.productId?.name || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={`${
                          i < r.rating ? "text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                  {r.comment || "—"}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredReviews.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-gray-500 py-8 italic">
                  No reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
