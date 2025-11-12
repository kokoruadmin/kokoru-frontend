// frontend/context/CartContext.js
"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  /* =========================================================
     🔹 Load cart from localStorage on page load (with migration)
  ========================================================= */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kokoru_cart");
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        setCart([]);
        return;
      }

      // Migration: ensure each cart item has canonical fields
      const migrated = parsed.map((item) => {
        // if item came from older structure, try to recover fields
        const price = Number(item.ourPrice ?? item.price ?? item.pricePerUnit ?? 0);
        const mrp = Number(item.mrp ?? item.MRP ?? item.priceBefore ?? price);
        const discount =
          item.discount ?? (mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);

        return {
          ...item,
          price,
          mrp,
          discount,
          // keep existing maxAllowed if present
          maxAllowed: item.maxAllowed ?? 10,
        };
      });

      setCart(migrated);
    } catch (error) {
      console.error("❌ Failed to load cart:", error);
      setCart([]);
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
    let allowedMax = product?.maxOrder ?? 10;

    if (Array.isArray(product?.colors) && selectedColor) {
      const color = product.colors.find(
        (c) => (c.name || "").toLowerCase() === (selectedColor || "").toLowerCase()
      );
      if (color && Array.isArray(color.sizes) && selectedSize) {
        const size = color.sizes.find(
          (s) => (s.label || "").toLowerCase() === (selectedSize || "").toLowerCase()
        );
        if (size) {
          if (size.max !== null && size.max !== undefined) allowedMax = size.max;
          allowedMax = Math.min(allowedMax, size.stock || 0);
        }
      } else if (color) {
        const totalStock = color.sizes?.reduce((sum, s) => sum + (s.stock || 0), 0) ?? 0;
        allowedMax = Math.min(allowedMax, totalStock || 0);
      }
    } else {
      allowedMax = Math.min(allowedMax, product?.stock ?? 0);
    }

    return allowedMax;
  };

  /* =========================================================
     🛒 Add Item to Cart
     Accepts either:
       - a product object (product, selectedColor, selectedSize, qty)
       - OR a pre-built cartItem object (backwards compatibility)
  ========================================================= */
  const addToCart = (productOrCartItem, selectedColor, selectedSize, quantity = 1) => {
    if (!productOrCartItem) return;

    // If the caller passed a pre-built cart item (your ProductPage previously did that),
    // use its _id and other fields. Otherwise, treat it as a product.
    const isCartItemShape = !!productOrCartItem?.key || (!!productOrCartItem?.quantity && !!productOrCartItem?._id);

    if (isCartItemShape) {
      // Normalize fields and prefer ourPrice
      const cartItem = {
        ...productOrCartItem,
        price: Number(productOrCartItem.ourPrice ?? productOrCartItem.price ?? 0),
        mrp: Number(productOrCartItem.mrp ?? productOrCartItem.price ?? 0),
        discount:
          productOrCartItem.discount ??
          (productOrCartItem.mrp
            ? Math.round(((productOrCartItem.mrp - (productOrCartItem.ourPrice ?? productOrCartItem.price)) / productOrCartItem.mrp) * 100)
            : 0),
        maxAllowed: productOrCartItem.maxAllowed ?? 10,
      };

      const uniqueKey = cartItem.key ?? `${cartItem._id}_${cartItem.colorName ?? "default"}_${cartItem.sizeLabel ?? "default"}`;

      setCart((prev) => {
        const existing = prev.find((i) => i.key === uniqueKey);
        if (existing) {
          const newQty = Math.min(existing.quantity + cartItem.quantity, existing.maxAllowed || cartItem.maxAllowed || 99);
          return prev.map((i) => (i.key === uniqueKey ? { ...i, quantity: newQty } : i));
        }
        return [...prev, { ...cartItem, key: uniqueKey }];
      });

      return;
    }

    // Otherwise it's a product object with optional color/size selected
    const product = productOrCartItem;
    if (!product._id) return;

    const price = Number(product.ourPrice ?? product.price ?? 0);
    const mrp = Number(product.mrp ?? product.price ?? price);
    const discount = product.discount ?? (mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);

    const allowedMax = getMaxAllowed(product, selectedColor, selectedSize);

    const uniqueKey = `${product._id}_${selectedColor ?? "default"}_${selectedSize ?? "default"}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.key === uniqueKey);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, existing.maxAllowed || allowedMax);
        return prev.map((item) => (item.key === uniqueKey ? { ...item, quantity: newQty } : item));
      }

      return [
        ...prev,
        {
          _id: product._id,
          key: uniqueKey,
          name: product.name,
          // Prefer the product's first image (first color's first image) as the canonical thumbnail
          imageUrl: product.colors?.[0]?.images?.[0] ?? product.imageUrl ?? "",
          colorName: selectedColor ?? null,
          sizeLabel: selectedSize ?? null,
          quantity: Math.min(quantity, allowedMax),
          maxAllowed: allowedMax,
          price,
          mrp,
          discount,
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
          ? { ...item, quantity: Math.min(item.quantity + 1, item.maxAllowed || 99) }
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
        .map((item) => (item.key === key ? { ...item, quantity: Math.max(item.quantity - 1, 1) } : item))
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
      price: item.price,
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
