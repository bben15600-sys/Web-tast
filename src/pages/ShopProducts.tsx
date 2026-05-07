import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { products } from "@/lib/shopData";

const SORTS = [
  { key: "featured", label: "מומלצים" },
  { key: "new",      label: "החדשים ביותר" },
  { key: "low",      label: "מחיר: נמוך לגבוה" },
  { key: "high",     label: "מחיר: גבוה לנמוך" },
] as const;

const CATEGORIES = [
  { key: "all",      label: "הכל" },
  { key: "טייצים",     label: "טייצים" },
  { key: "חזיות ספורט", label: "חזיות" },
  { key: "חולצות",    label: "חולצות" },
  { key: "מכנסיים",    label: "מכנסיים" },
  { key: "מכנסיים קצרים", label: "קצרים" },
  { key: "פליז",      label: "פליז" },
  { key: "גופיות",    label: "גופיות" },
];

export default function ShopProducts() {
  const [params, setParams] = useSearchParams();
  const tag = params.get("tag");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<typeof SORTS[number]["key"]>("featured");

  const items = useMemo(() => {
    let list = [...products];
    if (tag) list = list.filter((p) => p.tag === tag);
    if (cat !== "all") list = list.filter((p) => p.category === cat);
    if (sort === "low")  list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "new")  list.sort((a, b) => Number(b.tag === "new") - Number(a.tag === "new"));
    return list;
  }, [tag, cat, sort]);

  const heading = tag === "new"   ? "חדש בקולקציה"
                : tag === "sale"  ? "מבצעים"
                : "כל המוצרים";

  return (
    <ShopLayout>
      <div className="shop-section shop-section-tight">
        <nav className="shop-breadcrumb" aria-label="נתיב">
          <a href="/shop">בית</a>
          <span className="shop-breadcrumb-sep">/</span>
          <span>{heading}</span>
        </nav>

        <div className="shop-section-head">
          <h1 className="shop-section-title">{heading}</h1>
          <span className="text-sm text-[color:var(--shop-ink-mute)]">
            {items.length} מוצרים
          </span>
        </div>

        <div className="shop-toolbar" role="toolbar" aria-label="פילטרים ומיון">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                className="shop-pill"
                aria-pressed={cat === c.key}
                onClick={() => setCat(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="shop-pill cursor-pointer">
            מיון:
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-transparent border-0 outline-none font-semibold cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>

          {tag && (
            <button
              className="shop-pill"
              onClick={() => {
                params.delete("tag");
                setParams(params, { replace: true });
              }}
              aria-label="נקה פילטר"
            >
              נקה ✕
            </button>
          )}
        </div>

        <div className="mt-8">
          {items.length > 0 ? (
            <ProductGrid items={items} />
          ) : (
            <p className="text-center text-[color:var(--shop-ink-mute)] py-20">
              לא נמצאו מוצרים תואמים. נסה לשנות פילטרים.
            </p>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
