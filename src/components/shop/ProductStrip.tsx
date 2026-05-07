import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/shopData";

/**
 * Horizontal scroll-snap carousel of product cards. Mirrors Gymshark's
 * homepage strips. RTL-aware: arrows scroll in reading direction.
 */
export function ProductStrip({ items }: { items: Product[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // RTL: positive scrollBy moves logical-end (visually leftward in he-IL).
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="shop-strip-wrap">
      <button
        className="shop-strip-arrow shop-strip-arrow-prev"
        aria-label="הקודם"
        onClick={() => scroll(1)}
      >
        <ChevronRight size={20} />
      </button>
      <div className="shop-strip" ref={ref}>
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
      <button
        className="shop-strip-arrow shop-strip-arrow-next"
        aria-label="הבא"
        onClick={() => scroll(-1)}
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}
