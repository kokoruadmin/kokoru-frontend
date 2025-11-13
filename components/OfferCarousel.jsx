"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function OfferCarousel({ interval = 5000 }) {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products`),
          fetch(`${API_BASE_URL}/api/coupons`),
        ]);
        const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);

        const productOffers = (Array.isArray(pData) ? pData : [])
          .filter((p) => (p.offerTitle || p.offerText) && p.showInCarousel)
          .map((p) => ({
            id: `p-${p._id}`,
            type: "product",
            title: p.offerTitle || p.name,
            text: p.offerText || p.description || "",
            image: p.colors?.[0]?.images?.[0] || p.imageUrl || null,
            href: `/product/${p._id}`,
          }));

        const coupons = Array.isArray(cData) ? cData : [];
        const couponOffers = coupons
          .filter((c) => c.showInCarousel)
          .map((c) => ({
            id: `c-${c._id || c.code}`,
            type: "coupon",
            title: c.title || c.code || "Coupon",
            text: c.description || `${c.discountType === "percent" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}`,
            image: c.imageUrl || null,
            href: "/shop",
            code: c.code,
          }));

        if (!mounted) return;
        setItems([...productOffers, ...couponOffers]);
      } catch (err) {
        console.error("Failed to load offers", err);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (!items.length || items.length <= 1) return;

    const advance = () => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    timerRef.current = setInterval(advance, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [items.length, interval]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    // Reset timer when user manually navigates
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }, interval);
    }
  };

  const nextSlide = () => {
    goToSlide((currentIndex + 1) % items.length);
  };

  const prevSlide = () => {
    goToSlide(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className="relative">
        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.slice(0, 8).map((item) => (
            <OfferCard key={item.id} item={item} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden">
          <div 
            ref={carouselRef}
            className="overflow-hidden rounded-xl"
            onMouseEnter={() => clearInterval(timerRef.current)}
            onMouseLeave={() => {
              if (items.length > 1) {
                timerRef.current = setInterval(() => {
                  setCurrentIndex((prev) => (prev + 1) % items.length);
                }, interval);
              }
            }}
          >
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`
              }}
            >
              {items.map((item) => (
                <div key={item.id} className="w-full shrink-0 px-2">
                  <OfferCard item={item} />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          {items.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all duration-200"
                aria-label="Previous offer"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all duration-200"
                aria-label="Next offer"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Pagination dots */}
          {items.length > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentIndex
                      ? 'bg-purple-600 scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted card component for cleaner code
function OfferCard({ item }) {
  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Image/Icon */}
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-linear-to-br from-purple-100 to-pink-100">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {item.type === 'coupon' ? (
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {item.text}
                </p>
              </div>
              <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-full">
                {item.type === 'coupon' ? 'Coupon' : 'Offer'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={item.href}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors duration-200"
              >
                View Details
              </Link>

              {item.type === "coupon" && item.code && (
                <button
                  onClick={() => handleCopyCode(item.code)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors duration-200"
                >
                  Copy {item.code}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
