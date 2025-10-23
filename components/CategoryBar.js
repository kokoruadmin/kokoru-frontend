"use client";
import { useEffect, useRef } from "react";

export default function CategoryBar({
  categories,
  selectedCategory,
  setSelectedCategory,
}) {
  const barRef = useRef();

  // Smooth scroll on mouse wheel
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        bar.scrollLeft += e.deltaY;
      }
    };
    bar.addEventListener("wheel", handleWheel);
    return () => bar.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="sticky top-[64px] z-40 bg-gradient-to-r from-white via-purple-50/60 to-white border-t border-purple-100 shadow-sm">
      <div
        ref={barRef}
        className="flex overflow-x-auto gap-3 px-6 py-3 scrollbar-hide scroll-smooth"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`relative font-medium text-sm whitespace-nowrap px-5 py-1.5 rounded-full transition-all duration-200 border ${
              selectedCategory === cat
                ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md border-transparent scale-[1.05]"
                : "bg-white text-purple-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
