// utils/imageHelper.js

// 🟣 Helper to choose correct backend base URL (works for SSR + Android + Production)
export const getBaseURL = () => {
  // ✅ Prefer environment variable if provided
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // 🟡 Fallback to LAN IP (useful in local dev only)
  const LAN_IP = "192.168.1.22";
  const PORT = 5000;

  if (typeof window === "undefined") {
    // Running on server (Next.js SSR)
    return `http://${LAN_IP}:${PORT}`;
  }

  const { protocol, hostname } = window.location;

  if (/^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
    // Android or local Wi-Fi
    return `${protocol}//${hostname}:${PORT}`;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Desktop development
    return `http://${LAN_IP}:${PORT}`;
  }

  // 🌍 Production (e.g., Vercel)
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
