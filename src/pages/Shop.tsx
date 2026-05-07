import { Link } from "react-router-dom";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { Hero } from "@/components/shop/Hero";
import { ProductStrip } from "@/components/shop/ProductStrip";
import { CategoryTiles } from "@/components/shop/CategoryTiles";
import { EditorialSplit } from "@/components/shop/EditorialSplit";
import { products } from "@/lib/shopData";

export default function Shop() {
  const newIn = products.filter((p) => p.tag === "new" || p.tag === "bestseller");
  const all   = products;
  const sale  = products.filter((p) => p.tag === "sale");

  return (
    <ShopLayout>
      <Hero />

      <section className="shop-section" aria-labelledby="new-in">
        <div className="shop-section-head">
          <h2 id="new-in" className="shop-section-title">חדש בקולקציה</h2>
          <Link to="/shop/products?tag=new" className="shop-section-link">לכל החדשים</Link>
        </div>
        <ProductStrip items={newIn} />
      </section>

      <section className="shop-section" aria-labelledby="popular">
        <div className="shop-section-head">
          <h2 id="popular" className="shop-section-title">פופולרי כרגע</h2>
        </div>
        <CategoryTiles />
      </section>

      <section className="shop-section" aria-labelledby="all-spinners">
        <div className="shop-section-head">
          <h2 id="all-spinners" className="shop-section-title">כל הספינרים</h2>
          <Link to="/shop/products" className="shop-section-link">צפה בהכל</Link>
        </div>
        <ProductStrip items={all} />
      </section>

      <section className="shop-section" aria-labelledby="how-spin">
        <div className="shop-section-head">
          <h2 id="how-spin" className="shop-section-title">איפה אתה מסובב?</h2>
          <Link to="/shop/products" className="shop-section-link">כל הקולקציות</Link>
        </div>
        <EditorialSplit />
      </section>

      {sale.length > 0 && (
        <section className="shop-section" aria-labelledby="sale">
          <div className="shop-section-head">
            <h2 id="sale" className="shop-section-title">מבצעים</h2>
            <Link to="/shop/products?tag=sale" className="shop-section-link">לכל המבצעים</Link>
          </div>
          <ProductStrip items={sale} />
        </section>
      )}
    </ShopLayout>
  );
}
