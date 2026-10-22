"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);

  // Complete progress bar whenever route change completes
  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, hashes, or modified clicks
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if href is same page
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      // Start instant navigation progress
      setNavigating(true);
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  if (!navigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none">
      <div className="h-[3px] w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
    </div>
  );
}
