"use client";

import React from "react";
import { Share2 } from "lucide-react";

/**
 * ShareButton
 * Props:
 *  - product: { _id, name, description, imageUrl, colors? }
 *  - className: optional class for the button wrapper
 */
export default function ShareButton({ product, className = "" }) {
  if (!product) return null;

  const productUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/product/${product._id}`;

  const buildCaption = () => {
    const lines = [];
    lines.push(`🌸 ${product.name}`);
    if (product.description) lines.push(product.description);
    lines.push("");
    lines.push(`🛒 Shop Now: ${productUrl}`);
    lines.push("#kokoru #handcrafted #love");
    return lines.join("\n");
  };

  // choose the best image URL available
  const getImageUrl = () => {
    if (product.imageUrl) return product.imageUrl;
    // fallback to colors[].images[0] if present
    if (Array.isArray(product.colors) && product.colors.length > 0) {
      const firstColor = product.colors[0];
      if (Array.isArray(firstColor.images) && firstColor.images.length > 0) {
        return firstColor.images[0];
      }
    }
    return null;
  };

  // Try to fetch image and create File for navigator.share with files support
  const prepareImageFile = async (imageUrl) => {
    try {
      const res = await fetch(imageUrl, { mode: "cors" });
      if (!res.ok) throw new Error("Image fetch failed");
      const blob = await res.blob();
      // derive extension/type
      const ext = blob.type ? blob.type.split("/")[1] : "jpg";
      const filename = `${product.name.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
      // File constructor may not be supported in older browsers — but mobile modern browsers support it
      return new File([blob], filename, { type: blob.type });
    } catch (err) {
      console.warn("Could not prepare image file for sharing:", err);
      return null;
    }
  };

  const handleShare = async () => {
    const caption = buildCaption();
    const imageUrl = getImageUrl();

    // If Web Share API supports files (so we can share image + caption)
    if (navigator.share) {
      const shareData = { title: product.name, text: caption, url: productUrl };

      // attempt to include files if possible
      if (imageUrl && navigator.canShare) {
        try {
          const imageFile = await prepareImageFile(imageUrl);
          if (imageFile && navigator.canShare({ files: [imageFile] })) {
            // include both file and text/url
            shareData.files = [imageFile];
          }
        } catch (err) {
          console.warn("navigator.canShare/files attempt failed:", err);
        }
      }

      try {
        await navigator.share(shareData);
      } catch (err) {
        // share canceled by user or failed
        console.warn("Share failed or canceled:", err);
        // fallback: copy caption
        try {
          await navigator.clipboard.writeText(caption);
          alert("Share canceled or failed. Caption copied to clipboard.");
        } catch {
          // ignore
        }
      }
      return;
    }

    // If navigator.share not supported -> fallback: copy caption to clipboard and open product url in new tab
    try {
      await navigator.clipboard.writeText(caption);
      // open product page in new tab to make linking easier for user
      window.open(productUrl, "_blank");
      alert("Sharing via native apps not available. Caption copied to clipboard — open your app and paste it.");
    } catch (err) {
      console.warn("Clipboard write failed:", err);
      // last resort: open product page only
      window.open(productUrl, "_blank");
      alert("Sharing not supported. Opened product page in a new tab.");
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label={`Share ${product.name}`}
      title="Share"
      className={`inline-flex items-center justify-center rounded-full p-2 hover:bg-purple-50 active:scale-95 transition ${className}`}
    >
      <Share2 className="w-5 h-5 text-purple-700" />
    </button>
  );
}
