"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function OfferCarousel({ interval = 4000 }) {
  const [items, setItems] = useState([]);
  const containerRef = useRef(null);
  const idxRef = useRef(0);
  const timerRef = useRef(null);

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

    const advance = () => {
      if (!el) return;
      const cardWidth = el.firstElementChild?.clientWidth || el.clientWidth;
      idxRef.current = (idxRef.current + 1) % items.length;
      const newScroll = idxRef.current * (cardWidth + 16); // include gap
      el.scrollTo({ left: newScroll, behavior: "smooth" });
    };

    timerRef.current = setInterval(advance, interval);
    return () => clearInterval(timerRef.current);
  }, [items, interval]);

  if (!items || items.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto mb-6">
      <div className="overflow-hidden">
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar px-2 py-1 transition-all"
          onMouseEnter={() => clearInterval(timerRef.current)}
          onMouseLeave={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              const el = containerRef.current;
              if (!el) return;
              const cardWidth = el.firstElementChild?.clientWidth || el.clientWidth;
              idxRef.current = (idxRef.current + 1) % items.length;
              const newScroll = idxRef.current * (cardWidth + 16);
              el.scrollTo({ left: newScroll, behavior: "smooth" });
            }, interval);
          }}
        >
          {items.map((it) => (
            <div key={it.id} className="min-w-[320px] max-w-sm shrink-0 bg-white rounded-xl shadow-md border p-4">
              <div className="flex items-start gap-3">
                {it.image ? (
                  <img src={it.image} alt="" className="w-20 h-20 object-cover rounded" />
                ) : (
                  <div className="w-20 h-20 rounded bg-linear-to-br from-purple-200 to-pink-200 flex items-center justify-center text-purple-700 font-semibold">{it.type === 'coupon' ? 'COUPON' : 'OFFER'}</div>
                )}

                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{it.title}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-3">{it.text}</div>
                  <div className="mt-3 flex items-center gap-2">
                    {it.type === "coupon" && it.code && (
                      <button
                        onClick={() => navigator.clipboard?.writeText(it.code)}
                        className="text-xs px-2 py-1 border rounded bg-yellow-50"
                      >
                        Copy code
                      </button>
                    )}
                    <Link href={it.href} className="ml-auto text-xs text-purple-600 hover:underline">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
