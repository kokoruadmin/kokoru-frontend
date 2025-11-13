"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function OfferCarousel({ interval = 4000 }) {
  const [items, setItems] = useState([]);
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const idxRef = useRef(0);
  const timerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);

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
            image: null,
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

  useEffect(() => {
  const el = containerRef.current;
    if (!el || items.length <= 1) return;
    // Only auto-advance on mobile (width < 768px). We'll compute item width and translate the inner track.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!isMobile) return;

    const computeWidth = () => {
      const track = trackRef.current;
      const first = track?.children?.[0];
      if (first) {
        const style = window.getComputedStyle(first);
        const gap = parseInt(window.getComputedStyle(track).gap || 12, 10) || 12;
        const w = first.getBoundingClientRect().width + gap;
        setItemWidth(w);
      }
    };

    computeWidth();
    window.addEventListener("resize", computeWidth);

    const advance = () => {
      idxRef.current = (idxRef.current + 1) % items.length;
      setActiveIndex(idxRef.current);
    };

    timerRef.current = setInterval(advance, interval);
    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener("resize", computeWidth);
    };
  }, [items, interval]);

  if (!items || items.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto mb-6">
      <div className="overflow-hidden">
        {/* track container: we will translate this on mobile for auto-swipe. */}
        <div className="relative px-2 py-2">
          <div
            ref={trackRef}
            className="flex gap-3 items-start md:flex-wrap md:justify-center transition-transform duration-500"
            style={{
              transform:
                typeof window !== 'undefined' && window.innerWidth < 768
                  ? `translateX(-${activeIndex * itemWidth}px)`
                  : "none",
            }}
            onMouseEnter={() => clearInterval(timerRef.current)}
            onMouseLeave={() => {
              // resume auto play on mobile
              const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
              if (!isMobile) return;
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                idxRef.current = (idxRef.current + 1) % items.length;
                setActiveIndex(idxRef.current);
              }, interval);
            }}
          >
            {items.map((it, i) => (
              <div key={it.id} className="min-w-[82vw] max-w-xs shrink-0 md:w-72 bg-white rounded-2xl shadow-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    {it.image ? (
                      <img src={it.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-purple-200 to-pink-200 flex items-center justify-center text-purple-700 font-bold">{it.type === 'coupon' ? 'COUPON' : 'OFFER'}</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm md:text-base font-semibold text-gray-900 truncate">{it.title}</div>
                    <div className="text-xs md:text-sm text-gray-600 mt-1 truncate">{it.text}</div>

                    <div className="mt-3 flex items-center gap-3">
                      <Link href={it.href} className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-xs rounded shadow-sm">
                        View
                      </Link>

                      {it.type === "coupon" && it.code && (
                        <button
                          onClick={() => navigator.clipboard?.writeText(it.code)}
                          className="text-xs px-2 py-1 border rounded bg-yellow-50 font-medium"
                        >
                          {it.code}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* subtle badge to indicate source on desktop */}
                  <div className="hidden md:block text-xs text-gray-400 ml-3">{it.type === 'coupon' ? 'Coupon' : 'Offer'}</div>
                </div>
              </div>
            ))}
          </div>
          {/* pagination dots (mobile) */}
          <div className="mt-3 flex justify-center gap-2 md:hidden">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { idxRef.current = i; setActiveIndex(i); }}
                className={`w-2 h-2 rounded-full ${i === activeIndex ? 'bg-purple-600' : 'bg-gray-300'}`}
                aria-label={`Show slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
