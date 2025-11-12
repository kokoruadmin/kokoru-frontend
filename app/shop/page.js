"use client";
import { useEffect, useState, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import ProductCard from "../../components/ProductCard";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const rangeContainerRef = useRef(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // 🟣 Initialize AOS once + fetch products
  useEffect(() => {
    AOS.init({ duration: 800, easing: "ease-in-out", once: true });

    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("❌ Error fetching products:", err));
  }, []);

  // 🎚 Dual Range Slider Logic
  useEffect(() => {
    const container = rangeContainerRef.current;
    if (!container) return;

    const rangeSelected = container.querySelector(".range-selected");
    const minInput = container.querySelector(".range-input input.min");
    const maxInput = container.querySelector(".range-input input.max");
    const minNumber = container.querySelector(".range-price input[name='min']");
    const maxNumber = container.querySelector(".range-price input[name='max']");

    const RANGE_GAP = 100;
    const MAX_VAL = 10000;

    function updateUI(minVal, maxVal) {
      const left = (minVal / MAX_VAL) * 100;
      const right = 100 - (maxVal / MAX_VAL) * 100;
      rangeSelected.style.left = `${left}%`;
      rangeSelected.style.right = `${right}%`;
      minNumber.value = minVal;
      maxNumber.value = maxVal;
    }

    function handleRangeChange(e) {
      let minVal = parseInt(minInput.value);
      let maxVal = parseInt(maxInput.value);
      if (maxVal - minVal < RANGE_GAP) {
        if (e.target.classList.contains("min")) {
          minVal = maxVal - RANGE_GAP;
          minInput.value = minVal;
        } else {
          maxVal = minVal + RANGE_GAP;
          maxInput.value = maxVal;
        }
      }
      updateUI(minVal, maxVal);
      setPriceRange([minVal, maxVal]);
    }

    function handleNumberChange() {
      let minVal = parseInt(minNumber.value);
      let maxVal = parseInt(maxNumber.value);
      if (maxVal - minVal >= RANGE_GAP && maxVal <= MAX_VAL) {
        minInput.value = minVal;
        maxInput.value = maxVal;
        updateUI(minVal, maxVal);
        setPriceRange([minVal, maxVal]);
      }
    }

    minInput.addEventListener("input", handleRangeChange);
    maxInput.addEventListener("input", handleRangeChange);
    minNumber.addEventListener("input", handleNumberChange);
    maxNumber.addEventListener("input", handleNumberChange);

    updateUI(priceRange[0], priceRange[1]);

    return () => {
      minInput.removeEventListener("input", handleRangeChange);
      maxInput.removeEventListener("input", handleRangeChange);
      minNumber.removeEventListener("input", handleNumberChange);
      maxNumber.removeEventListener("input", handleNumberChange);
    };
  }, [priceRange]);

  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    return matchesCategory && matchesSearch && matchesPrice;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white text-gray-800 px-4 sm:px-8 py-10">
      {/* 🟣 Filter Section */}
      <section
        className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-purple-100 p-5 mb-10"
        data-aos="fade-up"
      >
        <h2 className="text-xl font-semibold text-purple-700 mb-5 text-center sm:text-left">
          Filter Your Products
        </h2>

        {/* 🔎 Search + Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Category Buttons */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center sm:justify-start">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-purple-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 🔍 Search Box + Price Range */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center sm:justify-end items-center w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search products..."
              className="border border-purple-200 rounded-lg px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-purple-300 outline-none w-52 md:w-60 bg-white text-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* 🎚 Dual Range Slider */}
            <div className="range" ref={rangeContainerRef}>
              <div className="range-slider">
                <span className="range-selected" />
              </div>
              <div className="range-input">
                <input
                  type="range"
                  className="min"
                  min="0"
                  max="10000"
                  step="100"
                  defaultValue="0"
                />
                <input
                  type="range"
                  className="max"
                  min="0"
                  max="10000"
                  step="100"
                  defaultValue="10000"
                />
              </div>
              <div className="range-price">
                <label htmlFor="min">Min</label>
                <input type="number" name="min" defaultValue="0" className="w-24 form-input" />
                <label htmlFor="max">Max</label>
                <input type="number" name="max" defaultValue="10000" className="w-24 form-input" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🛍 Product Grid */}
      <section
        data-aos="fade-up"
        className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
      >
        {filteredProducts.length > 0 ? (
          filteredProducts.map((item, i) => (
            <ProductCard key={item._id} item={item} i={i} />
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            No products found.
          </div>
        )}
      </section>
    </main>
  );
}
