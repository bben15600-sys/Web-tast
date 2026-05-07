import { useEffect } from "react";
import type { ReactNode } from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { ShopHeader } from "./ShopHeader";
import { ShopFooter } from "./ShopFooter";

/**
 * Wraps every shop page in the white/black storefront surface and
 * scrolls to top on navigation. The `.shop-root` class triggers the
 * body-level theme override defined in index.css.
 */
export function ShopLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="shop-root min-h-screen flex flex-col">
      <AnnouncementBar />
      <ShopHeader />
      <main className="flex-1">{children}</main>
      <ShopFooter />
    </div>
  );
}
