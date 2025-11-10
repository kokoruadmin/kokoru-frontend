"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Home as HomeIcon } from "lucide-react";

/**
 * AdminPage — with Cloudinary uploads (progress) for Add & Edit product
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [categoryStats, setCategoryStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const adminToken = localStorage.getItem("kokoru_admin_token");
    if (!adminToken) {
      router.push("/admin/login");
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      setErr("");
      try {
        const [pRes, oRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products`),
          fetch(`${API_BASE_URL}/api/orders/admin/all`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          }),
        ]);

        const products = (await pRes.json()) || [];
        const orders = (await oRes.json()) || [];

        if (cancelled) return;

        setProductsCount(Array.isArray(products) ? products.length : 0);

        // compute total stock across variants and top-level stock
        const computeStock = (p) => {
          try {
            if (Array.isArray(p.colors) && p.colors.length > 0) {
              let total = 0;
              for (const c of p.colors) {
                if (Array.isArray(c.sizes)) {
                  for (const s of c.sizes) total += Number(s.stock || 0);
                }
              }
              return total;
            }
            return Number(p.stock || 0);
          } catch (e) {
            return Number(p.stock || 0);
          }
        };

        const stockSum = Array.isArray(products) ? products.reduce((s, p) => s + computeStock(p), 0) : 0;
        setTotalStock(stockSum);

        setOrdersCount(Array.isArray(orders) ? orders.length : 0);

        const rev = Array.isArray(orders)
          ? orders.reduce((s, o) => s + (o.totalAfterDiscount || o.amount || 0), 0)
          : 0;
        setRevenue(rev);

        setRecentOrders(Array.isArray(orders) ? orders.slice(0, 8) : []);
        // fetch category stats (admin-only endpoint)
        try {
          const adminToken = localStorage.getItem("kokoru_admin_token");
          if (adminToken) {
            const cRes = await fetch(`${API_BASE_URL}/api/admin/category-stats`, { headers: { Authorization: `Bearer ${adminToken}` } });
            const cJson = await cRes.json();
            if (cRes.ok && cJson.ok) setCategoryStats(cJson.stats || []);
          }
        } catch (e) {
          console.warn('Failed to fetch category stats', e);
        }
      } catch (e) {
        console.error("Failed to fetch admin stats", e);
        setErr("Failed to load admin data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();

    // Auto-refresh polling removed. Use manual Refresh button to reload data.
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setLoading(true);
    setErr("");
    try {
      const adminToken = localStorage.getItem("kokoru_admin_token");
      const [pRes, oRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`),
        fetch(`${API_BASE_URL}/api/orders/admin/all`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);
      const products = (await pRes.json()) || [];
      const orders = (await oRes.json()) || [];
      setProductsCount(Array.isArray(products) ? products.length : 0);
      const computeStock = (p) => {
        try {
          if (Array.isArray(p.colors) && p.colors.length > 0) {
            let total = 0;
            for (const c of p.colors) {
              if (Array.isArray(c.sizes)) {
                for (const s of c.sizes) total += Number(s.stock || 0);
              }
            }
            return total;
          }
          return Number(p.stock || 0);
        } catch (e) {
          return Number(p.stock || 0);
        }
      };
      setTotalStock(Array.isArray(products) ? products.reduce((s, p) => s + computeStock(p), 0) : 0);
      setOrdersCount(Array.isArray(orders) ? orders.length : 0);
      setRevenue(Array.isArray(orders) ? orders.reduce((s, o) => s + (o.totalAfterDiscount || o.amount || 0), 0) : 0);
      setRecentOrders(Array.isArray(orders) ? orders.slice(0, 8) : []);
      // refresh category stats
      try {
        if (adminToken) {
          const cRes = await fetch(`${API_BASE_URL}/api/admin/category-stats`, { headers: { Authorization: `Bearer ${adminToken}` } });
          const cJson = await cRes.json();
          if (cRes.ok && cJson.ok) setCategoryStats(cJson.stats || []);
        }
      } catch (e) {
        console.warn('Failed to refresh category stats', e);
      }
    } catch (e) {
      console.error("Failed to refresh admin stats", e);
      setErr("Failed to refresh admin data");
    } finally {
      setLoading(false);
    }
  };

  function handleLogout() {
    localStorage.removeItem("kokoru_admin_token");
    router.push("/admin/login");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">
          <Link href="/admin" className="inline-flex items-center gap-2 text-purple-700 hover:underline">
            <span aria-hidden>🌸</span>
            <span>Kokoru Admin</span>
          </Link>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1 border rounded hover:bg-gray-100 text-sm flex items-center gap-2"
            title="Go Home"
          >
            <HomeIcon size={14} />
            Home
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
            title="Refresh"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1 border rounded hover:bg-gray-100"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : err ? (
        <div className="text-red-600">{err}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Products</div>
              <div className="text-xl font-medium">{productsCount}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Orders</div>
              <div className="text-xl font-medium">{ordersCount}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Stock</div>
              <div className="text-xl font-medium">{totalStock}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Revenue</div>
              <div className="text-xl font-medium">₹{revenue.toLocaleString()}</div>
            </div>
          </div>

          {/* Category stats */}
          {categoryStats && categoryStats.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Category Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {categoryStats.map((c) => (
                  <div key={c.category} className="p-3 border rounded bg-white">
                    <div className="text-sm text-gray-500">{c.category}</div>
                    <div className="text-xl font-semibold">Products: {c.totalProducts}</div>
                    <div className="text-sm text-gray-600">Stock: {c.totalStock}</div>
                    <div className="text-sm text-gray-600">Sold: {c.totalSold}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <section>
            <h2 className="text-lg font-medium mb-2">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <div className="text-sm text-gray-500">No recent orders</div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o) => (
                  <div
                    key={o._id || o.id}
                    className="p-3 border rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{o._id || o.id}</div>
                      <div className="text-sm text-gray-500">{o.user?.name || o.customerName || "Customer"}</div>
                      {/* show integrated address fields when available */}
                      {o.address ? (
                        <div className="text-sm text-gray-600 mt-1">
                          <div>{o.address.label ? `${o.address.label}: ` : ""}{o.address.address}</div>
                          <div className="text-xs text-gray-500">{o.address.place}{o.address.place && (o.address.district || o.address.state || o.address.pincode) ? ' • ' : ''}{o.address.district}{(o.address.district && o.address.state) ? ' • ' : ''}{o.address.state}{o.address.pincode ? ` • ${o.address.pincode}` : ''}</div>
                          {o.contact ? <div className="text-xs text-gray-500">Contact: {o.contact}</div> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div>₹{(o.totalAfterDiscount || o.amount || 0).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">{o.status || o.orderStatus || "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
