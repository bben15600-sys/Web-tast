import { Link } from "react-router-dom";
import { activities } from "@/lib/shopData";

export function EditorialSplit() {
  return (
    <div className="shop-editorial">
      {activities.map((a) => (
        <Link
          key={a.slug}
          to={`/shop/products?cat=${a.slug}`}
          className="shop-editorial-card"
          aria-label={a.label}
        >
          <img src={a.image} alt="" loading="lazy" />
          <div className="shop-editorial-card-inner">
            <p className="shop-editorial-eyebrow">איך אתה מתאמן?</p>
            <h3 className="shop-editorial-title">{a.label}</h3>
            <p className="text-sm/6 max-w-[40ch] mb-4 opacity-90">{a.blurb}</p>
            <span className="shop-btn shop-btn-outline self-start">קנה עכשיו</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
