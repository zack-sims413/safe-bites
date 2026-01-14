"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // When the route (pathname) changes, force scroll to top
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}