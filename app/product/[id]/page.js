"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { getImageUrl } from "../../../utils/imageHelper";
import { ShoppingCart, ArrowLeft, Zap } from "lucide-react";   // ⚡ added Zap icon
import { useCart } from "../../../context/CartContext";
import ShareButton from "../../../components/ShareButton";     // 📤 added ShareButton

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const MAX_ITEMS_PER_PRODUCT = product?.maxQuantity || 5;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
        const data = await res.json();
        setProduct(data);

        const firstInStockColor =
          data.colors?.find((c) => c.sizes?.some((s) => s.stock > 0)) ||
          data.colors?.[0] ||
          null;
        setSelectedColor(firstInStockColor);
        if (firstInStockColor?.sizes?.length) {
          const firstSize = firstInStockColor.sizes.find((s) => s.stock > 0);
          setSelectedSize(firstSize?.label || null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const getColorStock = (color) => {
    if (!color || !color.sizes) return 0;
    return color.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
  };

  const getSelectedStock = useMemo(() => {
    if (!selectedColor) return 0;
    if (selectedSize) {
      const s = selectedColor.sizes?.find((sz) => sz.label === selectedSize);
      return s?.stock || 0;
    }
    return getColorStock(selectedColor);
  }, [selectedColor, selectedSize]);

  const isOutOfStock = getSelectedStock <= 0;

  if (loading) return <div className="text-center p-10">Loading product...</div>;
  if (!product) return <div className="text-center p-10">Product not found.</div>;

  const images =
    selectedColor?.images?.length > 0
      ? selectedColor.images
      : product.colors?.flatMap((c) => c.images) || [product.imageUrl];

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (selectedColor?.sizes?.length && !selectedSize) {
      alert("Please select a size before adding to cart.");
      return;
    }
    if (navigator.vibrate) navigator.vibrate(30);

    const cartItem = {
      ...product,
      selectedColor: selectedColor?.name || null,
      selectedSize,
      imageUrl:
        selectedColor?.images?.[0] ||
        product.imageUrl ||
        (product.colors?.[0]?.images?.[0] ?? ""),
      quantity,
    };

    addToCart(cartItem);
  };

  // ⚡ BUY NOW: add and redirect
  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if (selectedColor?.sizes?.length && !selectedSize) {
      alert("Please select a size before buying.");
      return;
    }
    if (navigator.vibrate) navigator.vibrate(30);
    const cartItem = {
      ...product,
      selectedColor: selectedColor?.name || null,
      selectedSize,
      imageUrl:
        selectedColor?.images?.[0] ||
        product.imageUrl ||
        (product.colors?.[0]?.images?.[0] ?? ""),
      quantity,
    };
    addToCart(cartItem);
    router.push("/cart");
  };

  return (
    <main className="min-h-screen bg-purple-50 text-gray-800 p-6 flex justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-5xl w-full flex flex-col md:flex-row gap-6">
        {/* 🖼 Left Side */}
        <div className="md:w-1/2 w-full">
          <div className="relative w-full h-[350px] md:h-[420px] overflow-hidden rounded-xl">
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              spaceBetween={10}
              loop={images.length > 1}
              className="h-full w-full"
            >
              {images.map((img, index) => (
                <SwiperSlide key={index}>
                  <Image
                    src={getImageUrl(img)}
                    alt={product.name}
                    fill
                    className="object-cover rounded-xl"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        {/* 📄 Right Side */}
        <div className="md:w-1/2 w-full flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-700">{product.name}</h1>
            <p className="text-gray-500 mt-2">{product.category}</p>
            <p className="text-2xl font-semibold text-purple-800 mt-4">
              ₹ {product.price}
            </p>
            <p className="text-gray-600 mt-4 leading-relaxed">{product.description}</p>

            {/* 🎨 Color Variants */}
            {product.colors && product.colors.length > 0 && (
              <div className="mt-5">
                <h4 className="text-purple-700 font-semibold mb-2">Available Colors:</h4>
                <div className="flex items-center gap-3 flex-wrap">
                  {product.colors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedSize(null);
                      }}
                      className={`w-8 h-8 rounded-full border-2 ${
                        selectedColor?.name === color.name
                          ? "border-purple-600 scale-110"
                          : "border-gray-300"
                      } transition-all duration-200`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 📏 Sizes */}
            {selectedColor?.sizes?.length > 0 && (
              <div className="mt-5">
                <h4 className="text-purple-700 font-semibold mb-2">Select Size:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedColor.sizes.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSize(s.label)}
                      className={`px-3 py-1 border rounded-md text-sm font-medium transition-all duration-200
                        ${
                          selectedSize === s.label
                            ? "bg-purple-600 text-white border-purple-600"
                            : s.stock === 0
                            ? "bg-gray-100 text-gray-400 border-gray-300 opacity-60"
                            : "bg-white text-gray-800 border-gray-300 hover:border-purple-500"
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 🔢 Quantity Selector */}
            <div className="mt-6 flex items-center gap-3">
              <span className="text-gray-700 font-medium">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 text-lg font-bold text-purple-600 hover:text-purple-800"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = Math.max(
                      1,
                      Math.min(MAX_ITEMS_PER_PRODUCT, parseInt(e.target.value) || 1)
                    );
                    setQuantity(val);
                  }}
                  className="w-12 text-center border-x border-gray-300 outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(MAX_ITEMS_PER_PRODUCT, q + 1))
                  }
                  className="px-3 py-1 text-lg font-bold text-purple-600 hover:text-purple-800"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 🛒 Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 ${
                isOutOfStock
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 active:scale-95 text-white"
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 ${
                isOutOfStock
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-pink-600 hover:bg-pink-700 active:scale-95 text-white"
              }`}
            >
              <Zap className="w-5 h-5" />
              Buy Now
            </button>

            {/* 📤 Share Button */}
            <ShareButton product={product} />
          </div>

          <button
            onClick={() => router.push("/shop")}
            className="mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-sm bg-gray-100 hover:bg-gray-200 text-purple-700 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </button>
        </div>
      </div>
    </main>
  );
}
