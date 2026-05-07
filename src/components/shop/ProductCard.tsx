import { Link } from "react-router-dom";
import type { Product } from "@/lib/shopData";
import { formatPrice } from "@/lib/shopData";

const TAG_LABEL: Record<NonNullable<Product["tag"]>, string> = {
  new: "חדש",
  bestseller: "הכי נמכר",
  sale: "מבצע",
};

export function ProductCard({ product }: { product: Product }) {
  const [front, hover] = product.images;
  const firstColor = product.colors[0]?.name ?? "";
  return (
    <Link to={`/shop/products/${product.slug}`} className="shop-card" aria-label={product.name}>
      <div className="shop-card-media">
        {product.tag && (
          <span
            className={
              "shop-card-badge " + (product.tag === "sale" ? "shop-card-badge-light" : "")
            }
          >
            {TAG_LABEL[product.tag]}
          </span>
        )}
        <img src={front} alt={product.name} loading="lazy" />
        {hover && (
          <img
            src={hover}
            alt=""
            aria-hidden
            className="shop-card-img-hover"
            loading="lazy"
          />
        )}
        <button
          type="button"
          className="shop-card-quickadd"
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          הוספה מהירה +
        </button>
      </div>

      <div className="shop-card-info">
        <span className="shop-card-name">{product.name}</span>
        <span className="shop-card-fit">{product.fit.split(" — ")[0]}</span>
        <span className="shop-card-color">{firstColor} · {product.colors.length} צבעים</span>
        <span className="shop-card-price-row">
          <span className="shop-card-price-label">מחיר רגיל:</span>
          <span className="shop-card-price currency">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="shop-card-price-old currency">{formatPrice(product.oldPrice)}</span>
          )}
        </span>
      </div>
    </Link>
  );
}
