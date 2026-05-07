export function ShopFooter() {
  return (
    <footer className="shop-footer">
      <div className="shop-footer-inner">
        <div>
          <h4>הצטרף למועדון SPIN</h4>
          <p className="text-white/70 text-sm leading-6 max-w-[40ch]">
            10% הנחה על ההזמנה הראשונה, גישה מוקדמת להשקות חדשות, ועדכונים על דגמים מוגבלים.
          </p>
          <form
            className="shop-newsletter"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <input
              type="email"
              required
              placeholder="האימייל שלך"
              aria-label="כתובת אימייל"
            />
            <button type="submit">הרשמה</button>
          </form>
        </div>

        <div>
          <h4>קנייה</h4>
          <ul>
            <li><a href="/shop/products">כל הספינרים</a></li>
            <li><a href="/shop/products?cat=metal">מתכת</a></li>
            <li><a href="/shop/products?cat=led">LED</a></li>
            <li><a href="/shop/products?cat=pocket">פוקט מיני</a></li>
            <li><a href="/shop/products?tag=new">חדש בקולקציה</a></li>
            <li><a href="/shop/products?tag=sale">מבצעים</a></li>
          </ul>
        </div>

        <div>
          <h4>שירות לקוחות</h4>
          <ul>
            <li><a href="#">משלוחים והחזרות</a></li>
            <li><a href="#">מדריך מידות</a></li>
            <li><a href="#">צור קשר</a></li>
            <li><a href="#">שאלות נפוצות</a></li>
            <li><a href="#">מעקב הזמנה</a></li>
          </ul>
        </div>

        <div>
          <h4>החברה</h4>
          <ul>
            <li><a href="#">אודות</a></li>
            <li><a href="#">קריירה</a></li>
            <li><a href="#">אתיקה וקיימות</a></li>
            <li><a href="#">תוכנית שותפים</a></li>
            <li><a href="#">בלוג</a></li>
          </ul>
        </div>
      </div>

      <div className="shop-footer-bottom">
        <span>© {new Date().getFullYear()} SPIN. כל הזכויות שמורות.</span>
        <div className="flex gap-4">
          <a href="#">תקנון</a>
          <a href="#">פרטיות</a>
          <a href="#">נגישות</a>
        </div>
      </div>
    </footer>
  );
}
