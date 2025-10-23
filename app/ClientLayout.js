"use client";
import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [showNavbar, setShowNavbar] = useState(true);

  useEffect(() => {
    if (
      pathname?.startsWith("/checkout") ||
      pathname?.startsWith("/admin")
    ) {
      setShowNavbar(false);
    } else {
      setShowNavbar(true);
    }
  }, [pathname]);

  return (
    <>
      {showNavbar && <Navbar />}
      <main className={!pathname?.startsWith("/admin") ? "pt-[72px]" : ""}>
        {children}
      </main>
    </>
  );
}
