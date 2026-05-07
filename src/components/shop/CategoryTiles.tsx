import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { categories } from "@/lib/shopData";

export function CategoryTiles() {
  return (
    <div className="shop-cat-grid">
      {categories.map((c) => (
        <Link
          key={c.slug}
          to={`/shop/products?cat=${c.slug}`}
          className="shop-cat-tile"
          aria-label={c.label}
        >
          <img src={c.image} alt="" loading="lazy" />
          <div className="shop-cat-tile-overlay" aria-hidden />
          <div className="shop-cat-tile-label">
            <span>{c.label}</span>
            <ArrowLeft size={20} />
          </div>
        </Link>
      ))}
    </div>
  );
}
