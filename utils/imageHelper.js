// utils/imageHelper.js

// 🟣 Helper to choose correct backend base URL (works for SSR + Android + Desktop)
export const getBaseURL = () => {
  // ✅ Use LAN IP always (your backend’s reachable IP on Wi-Fi)
  const LAN_IP = "192.168.1.22";
  const PORT = 5000;

  if (typeof window === "undefined") {
    // Running on server (Next.js SSR)
    return `http://${LAN_IP}:${PORT}`;
  }

  const { protocol, hostname } = window.location;

  // ✅ If already visiting via LAN (e.g. Android uses 192.168.x.x)
  if (/^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
    return `${protocol}//${hostname}:${PORT}`;
  }

  // ✅ If localhost (desktop dev)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://${LAN_IP}:${PORT}`;
  }

  // ✅ Fallback for production deployment
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

  // ✅ Otherwise, treat as local/static
  return originalUrl;
};
