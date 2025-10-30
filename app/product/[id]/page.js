"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { getImageUrl } from "../../../utils/imageHelper";
import { ShoppingCart, ArrowLeft, Zap, Star } from "lucide-react";
import { useCart } from "../../../context/CartContext";
import ShareButton from "../../../components/ShareButton";

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

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const [selectedIndex, setSelectedIndex] = useState(0);
const [isZoomOpen, setIsZoomOpen] = useState(false);




  // Fetch product + reviews
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
    fetchReviews();
  }, [id]);

  async function fetchReviews() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/product/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : data || []);
      setAvgRating(data.avg || 0);
      setReviewsCount(
        data.count || (Array.isArray(data.reviews) ? data.reviews.length : 0)
      );
    } catch (e) {
      console.error("Failed to load reviews", e);
    }
  }

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

  // Pricing logic
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

  const submitReview = async () => {
    if (submittingReview) return;
    if (!ratingInput || ratingInput < 1)
      return alert("Please select a rating");

    const token =
      localStorage.getItem("kokoru_token") ||
      localStorage.getItem("kokoru_user_token");
    if (!token) return alert("Please login to submit a review.");

    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/${product._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: ratingInput,
          comment: commentInput.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      setCommentInput("");
      setRatingInput(5);
      fetchReviews();
    } catch {
      alert("Failed to submit review. Try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <main className="min-h-screen bg-purple-50 text-gray-800 p-6 flex flex-col items-center pb-40">
      {/* Product details container */}
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-5xl w-full flex flex-col md:flex-row gap-6">

{/* 🖼️ Stable collage layout (no jumping) */}
<div className="md:w-1/2 w-full">
  <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[420px] rounded-xl overflow-hidden">
    {/* Main image - always fixed position */}
    <button
      onClick={() => setIsZoomOpen(true)}
      className="col-span-1 row-span-2 relative overflow-hidden rounded-lg"
    >
      <img
        src={getImageUrl(images[selectedIndex])}
        alt="Main product"
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </button>

    {/* Two static thumbnail positions */}
    {images
      .filter((_, i) => i !== selectedIndex)
      .slice(0, 2)
      .map((img, i) => (
        <button
          key={i}
          onClick={() =>
            setSelectedIndex(
              images.indexOf(img) // swap content only
            )
          }
          className="col-span-1 row-span-1 relative overflow-hidden rounded-lg"
        >
          <img
            src={getImageUrl(img)}
            alt={`Thumbnail ${i + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          />
        </button>
      ))}
  </div>
</div>


{/* 🔍 Fullscreen Zoom Viewer */}
{isZoomOpen && (
  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
    {/* Close Button */}
    <button
      onClick={() => setIsZoomOpen(false)}
      className="absolute top-4 right-4 text-white text-3xl font-bold hover:scale-110 transition"
    >
      &times;
    </button>

    {/* Image */}
    <img
      src={getImageUrl(images[selectedIndex])}
      alt="Zoomed product view"
      className="max-w-[90%] max-h-[85%] object-contain rounded-lg shadow-2xl zoom-enter"
    />

    {/* Prev / Next Arrows */}
    {images.length > 1 && (
      <>
        <button
          onClick={() =>
            setSelectedIndex(
              (selectedIndex - 1 + images.length) % images.length
            )
          }
          className="absolute left-6 text-white text-4xl hover:scale-110 transition select-none"
        >
          ‹
        </button>

        <button
          onClick={() =>
            setSelectedIndex((selectedIndex + 1) % images.length)
          }
          className="absolute right-6 text-white text-4xl hover:scale-110 transition select-none"
        >
          ›
        </button>
      </>
    )}
  </div>
)}

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

          {/* Average rating */}
          <div className="mt-2 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={`${
                  i < Math.round(avgRating)
                    ? "text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="text-sm text-gray-600">
              {avgRating?.toFixed(1) || "0.0"} ({reviewsCount || 0})
            </span>
          </div>

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
                  Get it in 3-4 days
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

          {/* Return/COD */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {product.allowReturn && (
              <div className="text-xs border rounded px-2 py-1 bg-white">
                15 Days Return
              </div>
            )}
            {product.allowExchange && (
              <div className="text-xs border rounded px-2 py-1 bg-white">
                15 Days Exchange
              </div>
            )}
            {product.allowCOD && (
              <div className="text-xs border rounded px-2 py-1 bg-white">
                Cash On Delivery
              </div>
            )}
          </div>

          {/* Offer */}
          <div className="mt-3 border rounded-lg p-3 bg-purple-50">
            <div className="text-sm font-semibold text-purple-700">
              {product.offerTitle || "First Order Offer"}
            </div>
            <div className="text-xs text-gray-700">
              {product.offerText ||
                "Get ₹150 off on your first order above ₹999"}
            </div>
          </div>

          {/* Product Details */}
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-gray-800">
              Product Details
            </summary>
            <div className="mt-2 text-sm text-gray-600">
              {product.longDescription ||
                product.description ||
                "No additional details."}
            </div>
          </details>

          {/* Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold ${
                isOutOfStock
                  ? "bg-gray-400 text-gray-200"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              {isOutOfStock ? "Out of Stock" : "Add to Bag"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold ${
                isOutOfStock
                  ? "bg-gray-400 text-gray-200"
                  : "bg-pink-600 hover:bg-pink-700 text-white"
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

      {/* Reviews Section */}
      <section className="max-w-5xl w-full mt-10 bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Reviews</h3>

        {/* Overall rating */}
        <div className="flex items-center gap-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={20}
              className={`${
                i < Math.round(avgRating) ? "text-yellow-400" : "text-gray-300"
              }`}
            />
          ))}
          <span className="text-gray-700 text-sm">
            {avgRating.toFixed(1)} ({reviewsCount} reviews)
          </span>
        </div>

        {/* Review form */}
        <div className="border rounded p-4 mb-6">
          <p className="font-medium text-gray-700 mb-2">Rate this product</p>
          <div className="flex items-center gap-2 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setRatingInput(i + 1)}
                className={`${
                  i < ratingInput ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                <Star size={24} />
              </button>
            ))}
          </div>
          <textarea
            className="w-full border rounded-md p-2 text-sm mb-3"
            placeholder="Write your review (optional)"
            rows={3}
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setRatingInput(5);
                setCommentInput("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={submitReview}
              disabled={submittingReview}
              className={`px-5 py-2 rounded-md text-sm font-medium text-white ${
                submittingReview
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>

        {/* Review list */}
        <div className="space-y-4">
          {reviews && reviews.length > 0 ? (
            reviews.map((rv) => (
              <div
                key={rv._id}
                className="border border-gray-100 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800">
                    {rv.userName || rv.userEmail || "Customer"}
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={16}
                        className={`${
                          idx < rv.rating ? "text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rv.comment && (
                  <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                    {rv.comment}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(rv.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">No reviews yet.</div>
          )}
        </div>
      </section>

      {/* Size Chart Modal */}
      {sizeChartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">Size Chart</h4>
              <button
                onClick={() => setSizeChartOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                  <th className="p-2 text-left">Size</th>
                  <th className="p-2 text-left">Chest (in)</th>
                  <th className="p-2 text-left">Waist (in)</th>
                  <th className="p-2 text-left">Length (in)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-2">S</td><td className="p-2">36</td><td className="p-2">32</td><td className="p-2">27</td></tr>
                <tr><td className="p-2">M</td><td className="p-2">38</td><td className="p-2">34</td><td className="p-2">28</td></tr>
                <tr><td className="p-2">L</td><td className="p-2">40</td><td className="p-2">36</td><td className="p-2">29</td></tr>
                <tr><td className="p-2">XL</td><td className="p-2">42</td><td className="p-2">38</td><td className="p-2">30</td></tr>
                <tr><td className="p-2">XXL</td><td className="p-2">44</td><td className="p-2">40</td><td className="p-2">31</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sticky bottom bar (for mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t p-2 shadow-md md:hidden flex items-center justify-between px-3">
        <button className="p-2 text-gray-500">♡</button>
        <button
          onClick={handleAddToCart}
          className="flex-1 mx-2 border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 font-medium"
        >
          Add to Bag
        </button>
        <button
          onClick={handleBuyNow}
          className="bg-purple-600 text-white rounded px-4 py-3 font-medium"
        >
          Buy Now
        </button>
      </div>

      {/* Fullscreen Lightbox */}
    </main>
  );
}
