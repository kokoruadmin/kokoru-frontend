"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* -------- ENV CONFIG -------- */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function AdminUsersPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ q: "" });
  const [loading, setLoading] = useState(true);
  const [deletingUsers, setDeletingUsers] = useState({});

  /* ---------------- MOUNT CHECK ---------------- */
  useEffect(() => {
    setIsClient(true);
  }, []);

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    if (!isClient) return;
    const token = localStorage.getItem("kokoru_admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
  }, [isClient, router]);

  /* ---------------- FETCH USERS ---------------- */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("kokoru_admin_token");
      const queryParams = new URLSearchParams();
      if (filter.q) queryParams.set("q", filter.q);
      
      const res = await fetch(`${API_BASE_URL}/api/users/admin/all?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClient) fetchUsers();
  }, [isClient]);

  /* ---------------- SEARCH ---------------- */
  const handleSearch = () => {
    fetchUsers();
  };

  /* ---------------- DELETE USER ---------------- */
  const deleteUser = async (userId, userName, userEmail) => {
    if (!confirm(`Are you sure you want to delete user "${userName || userEmail}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUsers((prev) => ({ ...prev, [userId]: true }));

    try {
      const token = localStorage.getItem("kokoru_admin_token");
      const res = await fetch(`${API_BASE_URL}/api/users/admin/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (data.success) {
        alert("✅ User deleted successfully!");
        fetchUsers(); // Refresh the list
      } else {
        alert(data.message || "Failed to delete user");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      alert("Error deleting user");
    } finally {
      setDeletingUsers((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (!isClient) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-purple-700">
          <Link href="/admin" className="inline-flex items-center gap-2 text-purple-700 hover:underline">
            <span aria-hidden>🌸</span>
            <span>Kokoru Admin</span>
          </Link>
          <span className="ml-4 text-gray-600">/ Users</span>
        </h1>
        
        <div className="flex items-center gap-2">
          <input
            className="w-64 form-input text-sm"
            placeholder="Search users by name or email..."
            value={filter.q || ""}
            onChange={(e) => setFilter({ q: e.target.value })}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Search
          </button>
          <button
            onClick={fetchUsers}
            className="px-3 py-2 border rounded text-sm hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading users...</div>
      ) : (
        <>
          {/* Users Count */}
          <div className="mb-4">
            <span className="text-sm text-gray-600">
              {users.length} user{users.length !== 1 ? "s" : ""} found
            </span>
          </div>

          {/* Users Table */}
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-purple-100 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-left">Contact</th>
                    <th className="p-3 text-left">Addresses</th>
                    <th className="p-3 text-center">Registration Date</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{user.name || "—"}</div>
                          <div className="text-gray-600 text-xs">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-gray-600">
                          {user.mobile ? (
                            <div>📱 {user.mobile}</div>
                          ) : (
                            <div className="text-gray-400">No mobile</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-gray-600">
                          {Array.isArray(user.addresses) && user.addresses.length > 0 ? (
                            <div>
                              {user.addresses.length} address{user.addresses.length !== 1 ? "es" : ""}
                              {user.addresses.slice(0, 2).map((addr, idx) => (
                                <div key={idx} className="text-gray-500 truncate max-w-xs">
                                  {addr.label}: {addr.address}
                                </div>
                              ))}
                              {user.addresses.length > 2 && (
                                <div className="text-gray-400">
                                  +{user.addresses.length - 2} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400">No addresses</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center text-xs text-gray-600">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteUser(user._id, user.name, user.email)}
                          disabled={deletingUsers[user._id]}
                          className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                        >
                          {deletingUsers[user._id] ? "Deleting..." : "🗑️ Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}