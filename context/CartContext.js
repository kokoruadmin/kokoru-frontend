"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  /* =========================================================
     🔹 Load cart from localStorage on page load
  ========================================================= */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kokoru_cart");
      if (saved) setCart(JSON.parse(saved));
    } catch (error) {
      console.error("❌ Failed to load cart:", error);
    }
  }, []);

  /* =========================================================
     🔹 Save cart whenever it changes
  ========================================================= */
  useEffect(() => {
    try {
      localStorage.setItem("kokoru_cart", JSON.stringify(cart));
    } catch (error) {
      console.error("❌ Failed to save cart:", error);
    }
  }, [cart]);

  /* =========================================================
     🧠 Helper - Get max allowed quantity for this item
  ========================================================= */
  const getMaxAllowed = (product, selectedColor, selectedSize) => {
    // Start with global maxOrder from backend
    let allowedMax = product.maxOrder || 10;

    if (Array.isArray(product.colors) && selectedColor) {
      const color = product.colors.find(
        (c) => c.name.toLowerCase() === selectedColor.toLowerCase()
      );
      if (color && Array.isArray(color.sizes) && selectedSize) {
        const size = color.sizes.find(
          (s) => s.label.toLowerCase() === selectedSize.toLowerCase()
        );
        if (size) {
          // Respect per-size max if defined
          if (size.max !== null && size.max !== undefined)
            allowedMax = size.max;
          // And make sure we don't exceed available stock
          allowedMax = Math.min(allowedMax, size.stock || 0);
        }
      } else if (color) {
        const totalStock = color.sizes?.reduce(
          (sum, s) => sum + (s.stock || 0),
          0
        );
        allowedMax = Math.min(allowedMax, totalStock || 0);
      }
    } else {
      // fallback for simple product without variants
      allowedMax = Math.min(allowedMax, product.stock || 0);
    }

    return allowedMax;
  };

  /* =========================================================
     🛒 Add Item to Cart (color, size & quantity)
  ========================================================= */
  const addToCart = (product, selectedColor, selectedSize, quantity = 1) => {
    if (!product?._id) return;

    const uniqueKey = `${product._id}_${selectedColor || "default"}_${
      selectedSize || "default"
    }`;

    const allowedMax = getMaxAllowed(product, selectedColor, selectedSize);

    setCart((prev) => {
      const existing = prev.find((item) => item.key === uniqueKey);

      if (existing) {
        const newQty = Math.min(
          existing.quantity + quantity,
          existing.maxAllowed || allowedMax
        );
        return prev.map((item) =>
          item.key === uniqueKey ? { ...item, quantity: newQty } : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          key: uniqueKey,
          colorName: selectedColor || null,
          sizeLabel: selectedSize || null,
          quantity: Math.min(quantity, allowedMax),
          maxAllowed: allowedMax, // ✅ store max per item
        },
      ];
    });
  };

  /* =========================================================
     ➕ Increase Quantity
  ========================================================= */
  const increaseQuantity = (key) => {
    setCart((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, item.maxAllowed || 99),
            }
          : item
      )
    );
  };

  /* =========================================================
     ➖ Decrease Quantity
  ========================================================= */
  const decreaseQuantity = (key) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.max(item.quantity - 1, 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  /* =========================================================
     ❌ Remove Item
  ========================================================= */
  const removeFromCart = (key) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  /* =========================================================
     🧹 Clear Cart
  ========================================================= */
  const clearCart = () => setCart([]);

  /* =========================================================
     🧾 Helper: Format Cart for Payment API
  ========================================================= */
  const getCartForPayment = () =>
    cart.map((item) => ({
      _id: item._id,
      colorName: item.colorName,
      sizeLabel: item.sizeLabel,
      quantity: item.quantity,
    }));

  /* =========================================================
     🧩 Context Value
  ========================================================= */
  const value = {
    cart,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    getCartForPayment,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
