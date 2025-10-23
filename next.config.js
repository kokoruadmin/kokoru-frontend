/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Keep this to avoid blocking external image proxies
    remotePatterns: [
      // 🌸 Local backend proxy (needed for Android & LAN devices)
      {
        protocol: "http",
        hostname: "192.168.1.22",
        port: "5000",
        pathname: "/api/image/**",
      },

      // 🌐 Common HTTPS image hosts
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

module.exports = nextConfig;
