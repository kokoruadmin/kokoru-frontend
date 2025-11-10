// utils/imageHelper.js

// 🟣 Helper to choose correct backend base URL (works for SSR + Android + Production)
export const getBaseURL = () => {
  // ✅ Prefer environment variable if provided
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // 🟡 No env var: sensible localhost fallback for local dev.
  // Prefer localhost:5000 so the app works on machines with dynamic Wi‑Fi IPs.
  const PORT = 5000;

  if (typeof window === "undefined") {
    // Running on server (Next.js SSR) — use localhost for local dev server
    return `http://localhost:${PORT}`;
  }

  const { protocol, hostname } = window.location;

  // If client is on a local network host (e.g., Android or LAN IP),
  // forward requests to that host's backend on the same machine/port.
  if (/^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
    return `${protocol}//${hostname}:${PORT}`;
  }

  // If running on localhost, point to local backend port
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://localhost:${PORT}`;
  }

  // Production: assume same origin (no proxy)
  return `${protocol}//${hostname}`;
};

// 🟣 Main image URL generator
export const getImageUrl = (originalUrl) => {
  if (!originalUrl) return "/no-image.jpg";

  // ✅ Skip already proxied URLs
  if (originalUrl.includes("/api/image?url=")) return originalUrl;

  const baseURL = getBaseURL();

  // ✅ Proxy any remote image (Drive, Cloudinary, etc.)
  if (originalUrl.startsWith("http")) {
    return `${baseURL}/api/image?url=${encodeURIComponent(originalUrl)}`;
  }

  // ✅ Otherwise, treat as local/static path
  return originalUrl;
};
