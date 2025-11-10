"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

export default function ReviewSection({ productId, API_BASE_URL }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (productId) fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/product/${productId}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setAvgRating(data.avg || 0);
      setReviewCount(data.count || data.reviews?.length || 0);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    }
  };

  const submitReview = async () => {
    if (!ratingInput || ratingInput < 1)
      return alert("Please select a rating.");
    const token =
      localStorage.getItem("kokoru_token") ||
      localStorage.getItem("kokoru_user_token");
    if (!token)
      return alert("Please login to submit a review.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/${productId}`, {
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
      if (!res.ok) throw new Error("Failed to post review");
      setCommentInput("");
      setRatingInput(5);
      fetchReviews();
    } catch (err) {
      alert("Failed to submit review.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          {avgRating.toFixed(1)} ({reviewCount} reviews)
        </span>
      </div>

      {/* Review Form */}
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
            disabled={submitting}
            className={`px-5 py-2 rounded-md text-sm font-medium text-white ${
              submitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
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
          <div className="text-sm text-gray-500 italic">
            No reviews yet.
          </div>
        )}
      </div>
    </section>
  );
}
