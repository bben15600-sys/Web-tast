import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Truck, RotateCcw, Shield } from "lucide-react";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { formatPrice, getProduct, relatedProducts } from "@/lib/shopData";

export default function ShopProduct() {
  const { slug = "" } = useParams();
  const product = getProduct(slug);

  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <ShopLayout>
        <div className="shop-section text-center">
          <h1 className="shop-section-title">המוצר לא נמצא</h1>
          <p className="mt-4">
            <Link to="/shop" className="shop-section-link">חזרה לחנות</Link>
          </p>
        </div>
      </ShopLayout>
    );
  }

  const related = relatedProducts(product.slug);

  return (
    <ShopLayout>
      <div className="shop-section shop-section-tight">
        <nav className="shop-breadcrumb" aria-label="נתיב">
          <Link to="/shop">בית</Link>
          <span className="shop-breadcrumb-sep">/</span>
          <Link to="/shop/products">חנות</Link>
          <span className="shop-breadcrumb-sep">/</span>
          <Link to={`/shop/products?cat=${encodeURIComponent(product.category)}`}>
            {product.category}
          </Link>
          <span className="shop-breadcrumb-sep">/</span>
          <span>{product.shortName}</span>
        </nav>

        <div className="shop-pdp">
          <div className="shop-pdp-gallery">
            {product.images.map((img, i) => (
              <div className="shop-pdp-shot" key={i}>
                <img src={img} alt={`${product.name} — תצוגה ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} />
              </div>
            ))}
          </div>

          <aside className="shop-pdp-meta">
            <p className="shop-pdp-section-label">{product.collection} · {product.fit}</p>
            <h1 className="shop-pdp-h1">{product.name}</h1>

            <div className="flex items-baseline gap-3">
              <span className="shop-pdp-price currency">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="shop-card-price-old currency">{formatPrice(product.oldPrice)}</span>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="shop-pdp-section-label">צבע: {product.colors[colorIdx].name}</span>
              </div>
              <div className="shop-color-row">
                {product.colors.map((c, i) => (
                  <button
                    key={c.hex}
                    className="shop-color-chip"
                    style={{ background: c.hex }}
                    aria-label={c.name}
                    aria-pressed={colorIdx === i}
                    onClick={() => setColorIdx(i)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="shop-pdp-section-label">מידה</span>
                <button className="text-xs underline underline-offset-2">מדריך מידות</button>
              </div>
              <div className="shop-size-grid">
                {product.sizes.map((s) => {
                  const out = product.unavailableSizes?.includes(s);
                  return (
                    <button
                      key={s}
                      className="shop-size"
                      disabled={out}
                      aria-pressed={size === s}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 items-stretch mt-2">
              <div className="flex items-center border border-[color:var(--shop-line)]">
                <button
                  type="button"
                  className="w-11 h-12 text-lg"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="הפחת כמות"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <button
                  type="button"
                  className="w-11 h-12 text-lg"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="הוסף כמות"
                >
                  +
                </button>
              </div>
              <button className="shop-btn shop-btn-dark flex-1" disabled={!size}>
                {size ? "הוסף לסל" : "בחר מידה"}
              </button>
              <button className="shop-icon-btn border border-[color:var(--shop-line)]" aria-label="הוסף לויש'ליסט">
                <Heart size={20} />
              </button>
            </div>

            <ul className="grid grid-cols-3 gap-3 text-xs text-[color:var(--shop-ink-soft)] mt-4">
              <li className="flex flex-col items-center text-center gap-1.5">
                <Truck size={18} /> משלוח חינם מעל ₪249
              </li>
              <li className="flex flex-col items-center text-center gap-1.5">
                <RotateCcw size={18} /> 30 ימי החזרה
              </li>
              <li className="flex flex-col items-center text-center gap-1.5">
                <Shield size={18} /> אחריות יצרן
              </li>
            </ul>

            <details className="shop-accordion" open>
              <summary>תיאור</summary>
              <div className="shop-accordion-body">{product.description}</div>
            </details>
            <details className="shop-accordion">
              <summary>מאפיינים</summary>
              <div className="shop-accordion-body">
                <ul className="list-disc list-inside space-y-1.5">
                  {product.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            </details>
            <details className="shop-accordion">
              <summary>בד וטיפול</summary>
              <div className="shop-accordion-body">
                <p>{product.fabric}</p>
                <p className="mt-2">כביסה ב-30°, אין להלבין. ייבוש שטוח. גיהוץ בטמפ' נמוכה.</p>
              </div>
            </details>
            <details className="shop-accordion">
              <summary>משלוחים והחזרות</summary>
              <div className="shop-accordion-body">
                משלוח רגיל: 2-4 ימי עסקים. משלוח מהיר: יום עסקים אחד. החזרות חינם תוך 30 יום מקבלת ההזמנה.
              </div>
            </details>
          </aside>
        </div>
      </div>

      <section className="shop-section" aria-labelledby="related">
        <div className="shop-section-head">
          <h2 id="related" className="shop-section-title">משלים את המראה</h2>
        </div>
        <ProductGrid items={related} />
      </section>
    </ShopLayout>
  );
}
