import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const NAV = [
  { label: "כל הספינרים", to: "/shop/products" },
  { label: "מתכת",       to: "/shop/products?cat=metal" },
  { label: "LED",        to: "/shop/products?cat=led" },
  { label: "פוקט",       to: "/shop/products?cat=pocket" },
  { label: "חדש",        to: "/shop/products?tag=new" },
  { label: "מבצעים",     to: "/shop/products?tag=sale" },
];

export function ShopHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="shop-header">
      <button
        className="shop-icon-btn shop-mobile-only"
        aria-label="פתח תפריט"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu size={20} />
      </button>

      <Link to="/shop" className="shop-logo" aria-label="דף הבית">
        SPIN
      </Link>

      <nav className="shop-nav" aria-label="ראשי">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className="shop-nav-link" end>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="ms-auto flex items-center gap-1">
        <button className="shop-icon-btn" aria-label="חיפוש"><Search size={20} /></button>
        <button className="shop-icon-btn" aria-label="חשבון"><User size={20} /></button>
        <button className="shop-icon-btn" aria-label="ויש'ליסט"><Heart size={20} /></button>
        <button className="shop-icon-btn" aria-label="סל קניות">
          <ShoppingBag size={20} />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="תפריט נייד"
          className="fixed inset-0 z-[60] bg-white p-6 lg:hidden"
        >
          <div className="flex justify-between items-center mb-8">
            <span className="shop-logo">SPIN</span>
            <button onClick={() => setOpen(false)} aria-label="סגור" className="shop-icon-btn">
              ✕
            </button>
          </div>
          <ul className="flex flex-col gap-5">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="text-2xl font-extrabold uppercase"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
