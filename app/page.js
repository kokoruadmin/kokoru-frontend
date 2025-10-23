"use client";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Home() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true,
      offset: 50,
    });
  }, []);

  return (
    <main className="min-h-screen bg-purple-50 text-gray-800">
      {/* 🌸 HERO SECTION */}
      <section className="text-center py-20 bg-gradient-to-b from-purple-100 to-purple-200">
        <h1
          data-aos="fade-down"
          className="text-5xl font-extrabold text-purple-700"
        >
          🌸 Kokoru
        </h1>
        <p
          data-aos="fade-up"
          className="text-lg text-gray-700 italic mt-3"
        >
          Kokoru wo Komete — Made with Heart
        </p>

        <p
          data-aos="fade-up"
          className="max-w-2xl mx-auto mt-6 text-gray-600 leading-relaxed"
        >
          At Kokoru, we believe beauty lives in simplicity. Each of our
          creations — from soft fabrics to aromatic teas and hand-crafted art —
          is made with care, love, and purpose.
        </p>

        <Link
          href="/shop"
          data-aos="zoom-in"
          className="inline-block mt-8 bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-purple-800 transition"
        >
          Explore Our Shop
        </Link>
      </section>

      {/* 🪡 CATEGORY INTRO SECTION */}
      <section className="py-16 px-6">
        <h2
          data-aos="fade-up"
          className="text-3xl font-bold text-center text-purple-700 mb-10"
        >
          Explore Our Creations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* CLOTHING */}
          <CategoryCard
            title="Clothing"
            image="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab"
            description="Elegant, handpicked pieces blending tradition and comfort."
          />
          {/* TEA */}
          <CategoryCard
            title="Tea"
            image="https://images.unsplash.com/photo-1556228720-195a672e8a03"
            description="Authentic blends for a soulful and aromatic experience."
          />
          {/* CRAFT */}
          <CategoryCard
            title="Craft"
            image="https://images.unsplash.com/photo-1578301978018-30057527ade0"
            description="Delicate handcrafted works that tell stories of care and detail."
          />
        </div>
      </section>

      {/* 💜 ABOUT SECTION */}
      <section className="bg-purple-100 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            data-aos="fade-up"
            className="text-3xl font-bold text-purple-700 mb-4"
          >
            About Kokoru
          </h2>
          <p
            data-aos="fade-up"
            className="text-gray-700 leading-relaxed text-lg"
          >
            “Kokoru wo Komete” — with heart and soul.  
            At Kokoru, each product is not just made — it’s crafted.  
            Inspired by simplicity, authenticity, and emotion,  
            our mission is to deliver products that make you feel connected,  
            serene, and beautifully human.
          </p>
        </div>
      </section>

      {/* 📞 CONTACT SECTION */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-purple-50 to-purple-100">
        <h2
          data-aos="fade-up"
          className="text-3xl font-bold text-purple-700 mb-6"
        >
          Connect with Us
        </h2>
        <p data-aos="fade-up" className="text-gray-700 mb-8">
          Have a question, collaboration idea, or feedback?  
          We’d love to hear from you!
        </p>

        <div className="flex justify-center gap-6 flex-wrap">
          <a
            href="https://wa.me/919999999999"
            target="_blank"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg shadow transition"
            data-aos="zoom-in"
          >
            WhatsApp Us
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg shadow transition"
            data-aos="zoom-in"
          >
            Instagram
          </a>
          <a
            href="mailto:kokoru.store@example.com"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow transition"
            data-aos="zoom-in"
          >
            Email Us
          </a>
        </div>
      </section>

      {/* 🩶 FOOTER */}
      <footer className="bg-purple-700 text-white text-center py-6 text-sm">
        © {new Date().getFullYear()} Kokoru. All Rights Reserved.
      </footer>
    </main>
  );
}

/* 🌸 Category Card Component */
function CategoryCard({ title, image, description }) {
  return (
    <div
      data-aos="fade-up"
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
    >
      <div className="relative w-full h-56">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover rounded-t-2xl"
        />
      </div>
      <div className="p-4 text-center">
        <h3 className="text-xl font-semibold text-purple-700 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
