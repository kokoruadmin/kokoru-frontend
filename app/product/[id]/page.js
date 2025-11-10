"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getImageUrl } from "../../../utils/imageHelper";
import Image from "next/image";
import { ShoppingCart, ArrowLeft, Zap, Star } from "lucide-react";
import { useCart } from "../../../context/CartContext";
import ShareButton from "../../../components/ShareButton";
import ReviewSection from "../../../components/ReviewSection";

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [eta, setEta] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Fetch product
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

  const getColorStock = (color) =>
    color?.sizes?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0;

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
  if (!product)
    return <div className="text-center p-10">Product not found.</div>;

  const images =
    selectedColor?.images?.length > 0
      ? selectedColor.images
      : product.colors?.flatMap((c) => c.images) || [product.imageUrl];

  const ourPrice =
    typeof product.ourPrice === "number" ? product.ourPrice : product.price;
  const discount =
    typeof product.discount === "number"
      ? product.discount
      : product.discount || 0;
  const mrp =
    typeof product.mrp === "number"
      ? product.mrp
      : discount > 0
      ? Math.round(ourPrice / (1 - discount / 100))
      : ourPrice;

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

  const checkDelivery = async (pinCode) => {
    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
      setEta(null);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pincode/estimate?pin=${pinCode}`
      );
      if (!res.ok) return setEta("Unavailable");
      const data = await res.json();
      setEta(data.text || data.eta || "Estimate not available");
    } catch {
      setEta("Estimate not available");
    }
  };

  return (
    <main className="min-h-screen bg-purple-50 text-gray-800 p-6 flex flex-col items-center pb-40">
      {/* Product details container */}
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-5xl w-full flex flex-col md:flex-row gap-6">
        {/* 🖼️ Product Images */}
        <div className="md:w-1/2 w-full">
          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[420px] rounded-xl overflow-hidden">
            <button
              onClick={() => setIsZoomOpen(true)}
              className="col-span-1 row-span-2 relative overflow-hidden rounded-lg"
            >
              <Image
                src={getImageUrl(images[selectedIndex])}
                alt="Main product"
                fill
                priority
                className="object-cover transition-transform duration-300 hover:scale-105"
              />
            </button>

            {images
              .filter((_, i) => i !== selectedIndex)
              .slice(0, 2)
              .map((img, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setSelectedIndex(images.indexOf(img))
                  }
                  className="col-span-1 row-span-1 relative overflow-hidden rounded-lg"
                >
                  <Image
                    src={getImageUrl(img)}
                    alt={`Thumbnail ${i + 1}`}
                    width={300}
                    height={200}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                </button>
              ))}
          </div>
        </div>

        {/* Right - Info */}
        <div className="md:w-1/2 w-full flex flex-col">
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500 mt-2">{product.category}</p>

          {/* Price block */}
          <div className="mt-4 flex items-baseline gap-3">
            <div className="text-3xl font-extrabold text-gray-900">
              ₹{ourPrice}
            </div>
            <div className="text-sm text-gray-400 line-through">MRP ₹{mrp}</div>
            {discount > 0 && (
              <div className="text-sm text-green-600 font-medium">
                Flat {discount}% Off
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 mt-3 leading-relaxed">
            {product.description}
          </p>

          {/* Colors */}
          {product.colors?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-gray-800 font-medium mb-2">
                Available Colors
              </h4>
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

          {/* Sizes */}
          {selectedColor?.sizes?.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-gray-800 font-medium">Pick a Size</h4>
                <button
                  onClick={() => setSizeChartOpen(true)}
                  className="text-sm text-purple-700 underline"
                >
                  Size Chart
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedColor.sizes.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSize(s.label)}
                    className={`px-3 py-1 border rounded-md text-sm font-medium ${
                      selectedSize === s.label
                        ? "bg-purple-600 text-white border-purple-600"
                        : s.stock === 0
                        ? "bg-gray-100 text-gray-400 border-gray-300"
                        : "bg-white text-gray-800 border-gray-300 hover:border-purple-500"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery estimate */}
          <div className="mt-4 border rounded p-3 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Get it in 3–4 days
                </div>
                <div className="text-xs text-gray-500">
                  Enter pincode to check exact date
                </div>
              </div>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onBlur={() => checkDelivery(pin)}
                placeholder="Pincode"
                className="border rounded px-3 py-2 w-28"
              />
            </div>
            {eta && (
              <div className="mt-2 text-sm text-green-700">
                Estimated delivery: {eta}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="hidden md:flex mt-6 flex-col sm:flex-row gap-4 items-center">
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
              {isOutOfStock ? "Out of Stock" : "Add to Bag"}
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

            <ShareButton product={product} />
          </div>

          <button
            onClick={() => router.push("/shop")}
            className="mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-purple-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </button>
        </div>
      </div>

      {/* ✅ Modular Reviews */}
      <ReviewSection productId={product._id} API_BASE_URL={API_BASE_URL} />
    </main>
  );
}
