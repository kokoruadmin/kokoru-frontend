"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { ShoppingCart } from "lucide-react";
import { getImageUrl } from "../utils/imageHelper";
import { useCart } from "../context/CartContext";
import ShareButton from "@/components/ShareButton";  // Import ShareButton

export default function ProductCard({ item, i }) {
  const { addToCart } = useCart();

  const getFirstInStockColor = (colors = []) =>
    colors.find((c) => c.sizes?.some((s) => s.stock > 0)) || colors[0] || null;

  const [selectedColor, setSelectedColor] = useState(() =>
    getFirstInStockColor(item.colors)
  );

  const [selectedSize, setSelectedSize] = useState(() => {
    const firstColor = getFirstInStockColor(item.colors);
    return firstColor?.sizes?.find((s) => s.stock > 0)?.label || null;
  });

  const [quantity, setQuantity] = useState(1);

  const currentStock = useMemo(() => {
    if (!selectedColor || !selectedColor.sizes) return item.stock || 0;
    if (selectedSize) {
      const sizeObj = selectedColor.sizes.find(
        (s) => s.label.toLowerCase() === selectedSize.toLowerCase()
      );
      return sizeObj?.stock || 0;
    }
    return selectedColor.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
  }, [selectedColor, selectedSize, item.stock]);

  const maxAllowed = useMemo(() => {
    const productMax = item.maxOrder || 10;
    if (!selectedColor) return productMax;
    const size = selectedColor.sizes?.find(
      (s) => s.label.toLowerCase() === selectedSize?.toLowerCase()
    );
    if (size?.max) return Math.min(size.max, size.stock || productMax);
    return Math.min(productMax, size?.stock || currentStock || productMax);
  }, [item.maxOrder, selectedColor, selectedSize, currentStock]);

  const images = useMemo(() => {
    const validImages =
      selectedColor?.images?.length > 0
        ? selectedColor.images
        : item.colors?.flatMap((c) => c.images) || [];
    return validImages.length > 0 ? validImages : [item.imageUrl || "/no-image.jpg"];
  }, [selectedColor, item.colors, item.imageUrl]);

  const productLink = `/product/${item._id}`;

  const getColorTotalStock = (color) =>
    color?.sizes?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0;

  const isOutOfStock = (color) => getColorTotalStock(color) <= 0;
  const selectedIsOut = currentStock === 0;

  const handleAddToCart = (e) => {
    e?.preventDefault?.();
    if (selectedIsOut) return;
    if (selectedColor?.sizes?.length && !selectedSize) return;
    if (navigator.vibrate) navigator.vibrate(30);
    addToCart(item, selectedColor?.name || null, selectedSize || null, quantity);
  };

  const swiperKey = item._id;

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden ${
        selectedIsOut ? "opacity-80" : ""
      }`}
    >
      <Link href={productLink} passHref>
        <div className="cursor-pointer">
          <div className="relative w-full h-64 overflow-hidden bg-gray-50">
            <Swiper
              key={swiperKey}
              modules={[Pagination]}
              pagination={{ clickable: true }}
              spaceBetween={10}
              loop={images.length > 1}
              className="h-full w-full"
            >
              {images.map((img, index) => {
                const built = getImageUrl(img);
                const isProxied = /^https?:\/\/[^/]+:5000\/api\/image/i.test(built);

                return (
                  <SwiperSlide key={`${item._id}-${index}`}>
                    <div className="relative w-full h-64">
                      {isProxied ? (
                        <img
                          src={built}
                          alt={item.name}
                          className={`object-cover w-full h-full transition-transform duration-500 hover:scale-105 ${
                            selectedIsOut ? "grayscale opacity-90" : ""
                          }`}
                          loading={index === 0 ? "eager" : "lazy"}
                          onError={(e) => (e.currentTarget.src = "/no-image.jpg")}
                        />
                      ) : (
                        <Image
                          src={built}
                          alt={item.name}
                          fill
                          unoptimized
                          priority={index === 0}
                          sizes="100vw"
                          className={`object-cover transition-transform duration-500 hover:scale-105 ${
                            selectedIsOut ? "grayscale opacity-90" : ""
                          }`}
                          onError={(e) => {
                            try {
                              e.target.src = "/no-image.jpg";
                            } catch (err) {}
                          }}
                        />
                      )}
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>

            <div
              className={`absolute top-3 left-3 text-xs font-medium px-3 py-1 rounded-full shadow ${
                selectedIsOut ? "bg-red-500 text-white" : "bg-green-500 text-white"
              }`}
            >
              {selectedIsOut ? "Out of Stock" : "In Stock"}
            </div>
          </div>

          <div className="p-4 flex flex-col justify-between h-[210px]">
            <div>
              <h3 className="text-lg font-bold text-purple-700 truncate">{item.name}</h3>
              <p className="text-gray-500 text-sm mt-1 truncate">{item.category}</p>
              <p className="text-purple-800 font-semibold mt-2 text-lg">₹ {item.price}</p>

              {item.colors && item.colors.length > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  {item.colors.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedColor(color);
                        setSelectedSize(null);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                        selectedColor?.name === color.name ? "border-purple-600 scale-110" : "border-gray-300"
                      } ${isOutOfStock(color) ? "opacity-60" : ""}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              )}

              {selectedColor?.sizes?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedColor.sizes.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedSize(s.label);
                      }}
                      className={`px-3 py-1 border rounded-md text-sm font-medium transition-all duration-200 ${
                        selectedSize === s.label
                          ? "bg-purple-600 text-white border-purple-600"
                          : s.stock === 0
                          ? "bg-white text-gray-500 border-gray-200"
                          : "bg-white text-gray-800 border-gray-300 hover:border-purple-500"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Quantity and Buttons */}
      <div className="flex justify-center items-center gap-2 mt-2 mb-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setQuantity((q) => Math.max(1, q - 1));
          }}
          className="w-7 h-7 bg-gray-200 text-purple-700 rounded-full font-bold"
        >
          -
        </button>
        <span className="w-6 text-center">{quantity}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setQuantity((q) => Math.min(maxAllowed, q + 1));
          }}
          className="w-7 h-7 bg-purple-600 text-white rounded-full font-bold"
        >
          +
        </button>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-b-xl font-semibold shadow-sm transition-all duration-200 ${
          selectedIsOut ? "bg-gray-400 text-white cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 active:scale-95 text-white"
        }`}
      >
        {selectedIsOut ? "Out of Stock" : (
          <>
            <ShoppingCart className="w-5 h-5" /> Add to Cart
          </>
        )}
      </button>

      {!selectedIsOut && (
        <p className="text-center text-xs text-gray-500 mt-1 mb-2">
          Max {maxAllowed} per order
        </p>
      )}

      {/* 📤 Share Button */}
      <div className="flex justify-center mb-3">
        <ShareButton product={item} className="p-2 rounded-full bg-purple-50 hover:bg-purple-100" />
      </div>
    </div>
  );
}
