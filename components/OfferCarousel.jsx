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
        {/* Banner-style carousel for both desktop and mobile */}
        <div 
          ref={carouselRef}
          className="overflow-hidden rounded-2xl"
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
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`
            }}
          >
            {items.map((item) => (
              <div key={item.id} className="w-full shrink-0">
                <OfferBanner item={item} />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-xl rounded-full p-3 z-10 transition-all duration-200 backdrop-blur-sm"
              aria-label="Previous offer"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-xl rounded-full p-3 z-10 transition-all duration-200 backdrop-blur-sm"
              aria-label="Next offer"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Pagination dots */}
        {items.length > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-purple-600 w-8'
                    : 'bg-gray-300 hover:bg-gray-400 w-2'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Banner-style component inspired by Myntra's design
function OfferBanner({ item }) {
  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Dynamic gradient based on offer type
  const getGradientClass = (type) => {
    if (type === 'coupon') {
      return 'bg-linear-to-r from-orange-400 via-pink-400 to-purple-500';
    }
    return 'bg-linear-to-r from-blue-500 via-purple-500 to-pink-500';
  };

  const getOfferPercentage = (text) => {
    // Try to extract percentage from text
    const match = text.match(/(\d+)%/);
    return match ? match[1] : null;
  };

  const getOfferAmount = (text) => {
    // Try to extract rupee amount from text
    const match = text.match(/₹(\d+)/);
    return match ? match[1] : null;
  };

  const percentage = getOfferPercentage(item.text);
  const amount = getOfferAmount(item.text);

  return (
    <div className={`relative h-40 md:h-48 ${getGradientClass(item.type)} rounded-2xl overflow-hidden shadow-xl`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-4 border-white"></div>
        <div className="absolute bottom-4 right-8 w-20 h-20 rounded-full border-2 border-white"></div>
        <div className="absolute top-1/2 right-2 w-12 h-12 rounded-full border border-white"></div>
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-between p-6 md:p-8">
        {/* Left side - Offer text */}
        <div className="flex-1 text-white">
          {item.type === 'coupon' ? (
            <div>
              <div className="flex items-baseline space-x-2 mb-2">
                <span className="text-3xl md:text-5xl font-bold">
                  {percentage ? `${percentage}%` : amount ? `₹${amount}` : 'Get'}
                </span>
                <span className="text-xl md:text-2xl font-semibold">
                  {percentage || amount ? 'OFF' : 'Discount'}
                </span>
              </div>
              <div className="text-sm md:text-base opacity-90 mb-4">
                {item.text}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl md:text-4xl font-bold mb-2">{item.title}</h2>
              <p className="text-sm md:text-base opacity-90 mb-4">{item.text}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={item.href}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200 shadow-lg"
            >
              {item.type === 'coupon' ? 'Shop Now' : 'View Offer'}
            </Link>
          </div>
        </div>

        {/* Right side - Coupon code or visual element */}
        <div className="flex flex-col items-end space-y-4">
          {item.type === 'coupon' && item.code && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <div className="text-center">
                <div className="text-xs text-white/80 mb-1 font-medium">COUPON CODE</div>
                <div className="text-lg font-bold text-white tracking-wider mb-3">
                  {item.code}
                </div>
                <button
                  onClick={() => handleCopyCode(item.code)}
                  className="w-full px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded-md hover:bg-gray-100 transition-colors duration-200"
                >
                  Copy Code
                </button>
              </div>
            </div>
          )}

          {/* Decorative percentage symbol */}
          {(percentage || amount) && (
            <div className="hidden md:block text-8xl font-bold text-white/20">
              %
            </div>
          )}
        </div>
      </div>

      {/* Bottom info */}
      {item.type === 'coupon' && (
        <div className="absolute bottom-4 left-6 text-xs text-white/70">
          On Your First Order | T&C Apply
        </div>
      )}
    </div>
  );
}
