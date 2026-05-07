import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/shopData";

export function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div className="shop-grid">
      {items.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
