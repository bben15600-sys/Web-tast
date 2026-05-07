// Mock dataset for the Gymshark-inspired storefront — pivoted to spinners.
// Replace with a real CMS / Shopify / Stripe source later — the page
// components only depend on these types, not on the loader.

export type Color = {
  name: string;
  hex: string;
  /** Override card images for this color. Falls back to product.images. */
  images?: string[];
};

export type Product = {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  collection: string;
  /** Order book signal — drives the "NEW" / "BEST" badges. */
  tag?: "new" | "bestseller" | "sale" | null;
  price: number;
  oldPrice?: number;
  description: string;
  features: string[];
  fabric: string;
  fit: string;
  sizes: string[];
  /** Sizes that are "out of stock" for the demo. */
  unavailableSizes?: string[];
  colors: Color[];
  /** Two images = front + hover swap. More are used on PDP. */
  images: string[];
};

export type Category = {
  slug: string;
  label: string;
  image: string;
};

export type Activity = {
  slug: string;
  label: string;
  blurb: string;
  image: string;
};

/* ─── SVG illustration factory ─────────────────────────────────────
   Inline data URIs so cards/PDP render without any network photo
   dependency. Each spinner is built from three lobes around a hub. */

const shade = (hex: string, pct: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const adj = Math.round((255 * pct) / 100);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + adj);
  const g = clamp(((n >> 8) & 0xff) + adj);
  const b = clamp((n & 0xff) + adj);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
};

const spinnerSvg = (
  lobe: string,
  hub: string,
  bg: string,
  rot = 0,
  lobes = 3,
): string => {
  const step = 360 / lobes;
  const lobeShapes = Array.from({ length: lobes })
    .map((_, i) => {
      const a = i * step;
      return `
        <g transform="rotate(${a})">
          <path d="M -55 0 L -45 -180 A 95 95 0 0 1 45 -180 L 55 0 Z" />
          <circle cx="0" cy="-180" r="92" />
          <circle cx="0" cy="-180" r="32" fill="${bg}" />
        </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="b" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="${shade(bg, 8)}"/>
        <stop offset="100%" stop-color="${shade(bg, -18)}"/>
      </radialGradient>
      <radialGradient id="h" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${shade(hub, 18)}"/>
        <stop offset="100%" stop-color="${shade(hub, -12)}"/>
      </radialGradient>
    </defs>
    <rect width="800" height="1000" fill="url(#b)"/>
    <g transform="translate(400 500) rotate(${rot})">
      <g fill="${lobe}" stroke="${shade(lobe, -25)}" stroke-width="2">
        ${lobeShapes}
      </g>
      <circle r="80" fill="url(#h)" stroke="${shade(hub, -25)}" stroke-width="2"/>
      <circle r="32" fill="${bg}"/>
      <circle r="14" fill="${shade(bg, -20)}"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const heroSpinnerSvg = (
  lobe: string,
  hub: string,
  bg: string,
  bg2: string,
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="hh" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${shade(hub, 25)}"/>
        <stop offset="100%" stop-color="${shade(hub, -10)}"/>
      </radialGradient>
      <filter id="sh" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="18" />
      </filter>
    </defs>
    <rect width="1600" height="900" fill="url(#hg)"/>
    <g opacity="0.18" fill="${lobe}">
      <circle cx="180" cy="160" r="220"/>
      <circle cx="1420" cy="780" r="280"/>
    </g>
    <g transform="translate(1100 500)">
      <ellipse cx="0" cy="240" rx="200" ry="14" fill="#000" opacity="0.25" filter="url(#sh)"/>
      <g transform="rotate(20)">
        <g fill="${lobe}" stroke="${shade(lobe, -22)}" stroke-width="3">
          ${[0, 120, 240].map((a) => `
            <g transform="rotate(${a})">
              <path d="M -65 0 L -52 -200 A 105 105 0 0 1 52 -200 L 65 0 Z"/>
              <circle cx="0" cy="-200" r="105"/>
              <circle cx="0" cy="-200" r="36" fill="${bg}"/>
            </g>`).join("")}
        </g>
        <circle r="92" fill="url(#hh)" stroke="${shade(hub, -22)}" stroke-width="3"/>
        <circle r="36" fill="${bg}"/>
        <circle r="14" fill="${shade(bg, -20)}"/>
      </g>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const tileSpinner = (lobe: string, hub: string, bg: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1066" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(bg, 10)}"/>
        <stop offset="100%" stop-color="${shade(bg, -15)}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="1066" fill="url(#t)"/>
    <g transform="translate(400 533) rotate(15)">
      <g fill="${lobe}" stroke="${shade(lobe, -22)}" stroke-width="2">
        ${[0, 120, 240].map((a) => `
          <g transform="rotate(${a})">
            <path d="M -55 0 L -45 -180 A 95 95 0 0 1 45 -180 L 55 0 Z"/>
            <circle cx="0" cy="-180" r="92"/>
            <circle cx="0" cy="-180" r="32" fill="${bg}"/>
          </g>`).join("")}
      </g>
      <circle r="78" fill="${hub}" stroke="${shade(hub, -22)}" stroke-width="2"/>
      <circle r="30" fill="${bg}"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/* ─── Content ─────────────────────────────────────────────────── */

export const heroSlides = [
  {
    eyebrow: "סדרת SPIN PRO 2026",
    title: "תסתובב. תרגע. תתרכז.",
    sub: "ספינרים בעיצוב פרימיום עם מיסבים קרמיים — סיבוב חלק עד 4 דקות, שקט מוחלט, גימור שלא מתנקש בכיס.",
    cta: { label: "קנה לבית", href: "/shop/products?gender=women" },
    ctaSecondary: { label: "קנה למשרד", href: "/shop/products?gender=men" },
    image: heroSpinnerSvg("#F5C24A", "#1A1A1A", "#0F1115", "#26203A"),
  },
  {
    eyebrow: "טכנולוגיית CERAMIC CORE",
    title: "השקט שעוזר לך לחשוב.",
    sub: "מיסב קרמי ZrO₂ שמייצר פחות חיכוך ואפס רעש. מתאים לשעות ריכוז ארוכות במשרד או בלימודים.",
    cta: { label: "גלה את הסדרה", href: "/shop/products?collection=pro" },
    image: heroSpinnerSvg("#7AC8E8", "#0E2A3A", "#0A1822", "#0F3247"),
  },
] as const;

export const announcements = [
  "משלוח חינם בהזמנות מעל ₪149  ·  החזרה חינם תוך 30 יום",
  "אחריות סיבוב ל-90 יום על כל ספינר",
  "חדש: סדרת SPIN STEEL מפלדת אל-חלד",
  "סטודנטים — 12% הנחה עם אימות",
];

export const categories: Category[] = [
  { slug: "classic", label: "קלאסי",     image: tileSpinner("#1A1A1A", "#7C7C7C", "#EFEAE2") },
  { slug: "led",     label: "LED מואר",  image: tileSpinner("#A78BFA", "#FFFFFF", "#0E0B1F") },
  { slug: "metal",   label: "מתכת",      image: tileSpinner("#B5A06B", "#5C4A22", "#1A1A1A") },
  { slug: "pocket",  label: "פוקט מיני",  image: tileSpinner("#E25D3A", "#1A1A1A", "#F5EFE6") },
];

export const activities: Activity[] = [
  {
    slug: "office",
    label: "במשרד",
    blurb: "ריכוז עמוק בשיחת זום ארוכה, פחות לחץ בידיים, יותר רעיונות בראש.",
    image: tileSpinner("#3D7AB2", "#0F1B2C", "#E7E2D7"),
  },
  {
    slug: "home",
    label: "בבית",
    blurb: "פינוק קטן ליום אחרי יום ארוך — שקט שלא מפריע לאף אחד אחר.",
    image: tileSpinner("#C73E5A", "#1A1A1A", "#F5EFE6"),
  },
];

const variants = (lobe: string, hub: string, bg: string): string[] => [
  spinnerSvg(lobe, hub, bg, 0),
  spinnerSvg(lobe, hub, bg, 60),
  spinnerSvg(lobe, hub, bg, 30),
  spinnerSvg(lobe, hub, bg, 90),
];

const PRODUCTS: Product[] = [
  {
    slug: "spin-one-classic",
    name: "SPIN ONE קלאסי שחור",
    shortName: "SPIN ONE קלאסי",
    category: "קלאסי",
    collection: "ONE",
    tag: "bestseller",
    price: 49,
    description:
      "הספינר הראשון של כל אחד — שלושה לוב'ים בפלסטיק ABS איכותי, מיסב פלדה, סיבוב חלק של עד 90 שניות. גודל מושלם לכף יד מבוגרת או יד גדולה של ילד.",
    features: [
      "מיסב פלדה ABEC-7 מאוורר",
      "פלסטיק ABS עמיד שלא נשרט בקלות",
      "משקל מאוזן ידנית — אפס רעידות",
      "מגיע בקופסה מתנה",
    ],
    fabric: "פלסטיק ABS מקצועי",
    fit: "סטנדרטי — קוטר 7 ס\"מ",
    sizes: ["מיני 5cm", "סטנדרט 7cm", "מקס 9cm"],
    unavailableSizes: ["מקס 9cm"],
    colors: [
      { name: "שחור פחם",  hex: "#1A1A1A" },
      { name: "לבן עז",   hex: "#F2EFE9" },
      { name: "אדום קלאסי", hex: "#A0322B" },
      { name: "כחול לילה",  hex: "#1E2A4A" },
    ],
    images: variants("#1A1A1A", "#7C7C7C", "#EFEAE2"),
  },
  {
    slug: "spin-glow-led",
    name: "SPIN GLOW — RGB LED",
    shortName: "SPIN GLOW",
    category: "LED מואר",
    collection: "GLOW",
    tag: "new",
    price: 99,
    description:
      "ספינר עם 9 נוריות RGB לכל לוב, שמתחלפות בעוצמת הסיבוב. סיבוב מהיר → קשת מלאה. כולל מטען USB-C ובטרייה ל-12 שעות אור רציף.",
    features: [
      "27 נוריות RGB (9 לכל לוב)",
      "סוללה נטענת USB-C, 12 שעות שימוש",
      "5 דפוסי תאורה לבחירה",
      "מתג שתיקה לכיבוי האור",
    ],
    fabric: "פוליקרבונט שקוף + LED",
    fit: "סטנדרטי — קוטר 7.5 ס\"מ",
    sizes: ["סטנדרט 7.5cm"],
    colors: [
      { name: "שחור עם RGB",  hex: "#0E0B1F" },
      { name: "שקוף עם RGB",  hex: "#E5E0F5" },
      { name: "ורוד עם RGB",  hex: "#D5A6CC" },
    ],
    images: variants("#A78BFA", "#FFFFFF", "#0E0B1F"),
  },
  {
    slug: "spin-steel-pro",
    name: "SPIN STEEL פלדת אל-חלד",
    shortName: "SPIN STEEL",
    category: "מתכת",
    collection: "STEEL",
    tag: "new",
    price: 189,
    description:
      "פלדת אל-חלד 304 בעיבוד CNC. מסה גבוהה שמייצרת תאוצה אדירה — סיבוב חלק שלוש דקות וחצי. מיסב קרמי היברידי ZrO₂ לשקט מוחלט.",
    features: [
      "פלדת אל-חלד 304 בעיבוד CNC",
      "מיסב קרמי היברידי ZrO₂",
      "משקל 165 גרם — תחושה רצינית ביד",
      "ערבות סיבוב ל-90 יום",
    ],
    fabric: "פלדת אל-חלד 304",
    fit: "סטנדרטי — קוטר 7 ס\"מ, משקל 165 ג'",
    sizes: ["סטנדרט 7cm"],
    colors: [
      { name: "פלדה מבריקה", hex: "#A8A8AC" },
      { name: "פלדה שחורה",  hex: "#2A2A2C" },
      { name: "פלדה כחולה",  hex: "#3D5A78" },
    ],
    images: variants("#A8A8AC", "#3F3F42", "#16161A"),
  },
  {
    slug: "spin-gold-brass",
    name: "SPIN GOLD — פליז מצופה",
    shortName: "SPIN GOLD",
    category: "מתכת",
    collection: "GOLD",
    tag: null,
    price: 249,
    description:
      "פליז מלא מצופה זהב 24K אמיתי. בעיצוב היד אצלך הוא מרגיש כמו מכשיר תכשיטים — כבד, חלק, יוקרתי. מתאים גם כמתנה.",
    features: [
      "פליז מלא, ציפוי זהב 24K",
      "מיסב קרמי שלם",
      "כל ספינר ממוספר ידנית",
      "אריזת עץ מלא + תעודת אחריות",
    ],
    fabric: "פליז + ציפוי זהב 24K",
    fit: "פרימיום — קוטר 7 ס\"מ, משקל 195 ג'",
    sizes: ["סטנדרט 7cm"],
    colors: [
      { name: "זהב מבריק",  hex: "#D4AF37" },
      { name: "זהב מט",     hex: "#9C7C25" },
      { name: "ברונזה",     hex: "#A0703A" },
    ],
    images: variants("#D4AF37", "#5C4A22", "#1A1A1A"),
  },
  {
    slug: "spin-pocket-mini",
    name: "SPIN POCKET — מיני",
    shortName: "SPIN POCKET",
    category: "פוקט מיני",
    collection: "POCKET",
    tag: "sale",
    price: 39,
    oldPrice: 59,
    description:
      "ספינר זעיר שנכנס לכיס המכנסיים בלי להרגיש. אידאלי לזמני המתנה, נסיעות ארוכות, או רגעי לחץ ברשות הרבים.",
    features: ["קוטר 5 ס\"מ בלבד", "משקל 22 גרם", "ציפוי קטיפה למגע נעים"],
    fabric: "אבץ מצופה קטיפה",
    fit: "מיני — קוטר 5 ס\"מ",
    sizes: ["מיני 5cm"],
    colors: [
      { name: "כתום קלאסי", hex: "#E25D3A" },
      { name: "ירוק יער",   hex: "#2E4A36" },
      { name: "ורוד אבק",   hex: "#D5A6A0" },
      { name: "אבן",        hex: "#D8CFB6" },
    ],
    images: variants("#E25D3A", "#1A1A1A", "#F5EFE6"),
  },
  {
    slug: "spin-pro-ceramic",
    name: "SPIN PRO — מיסב קרמי",
    shortName: "SPIN PRO",
    category: "מתכת",
    collection: "PRO",
    tag: "bestseller",
    price: 159,
    description:
      "המיסב הקרמי מייצר אפס חיכוך ואפס חום. תוצאה: סיבוב הכי שקט שתשמע, וזמני סיבוב של 4+ דקות מסיבוב יחיד.",
    features: [
      "מיסב קרמי ZrO₂ מלא",
      "סיבוב 4+ דקות במבחני מעבדה",
      "גוף אלומיניום קל אנודייז",
      "אריזת מתנה כלולה",
    ],
    fabric: "אלומיניום אנודייז + קרמיקה",
    fit: "סטנדרטי — קוטר 7 ס\"מ, משקל 78 ג'",
    sizes: ["סטנדרט 7cm"],
    colors: [
      { name: "אפור גרפיט", hex: "#4D4D4F" },
      { name: "כחול מטאלי", hex: "#2C5282" },
      { name: "אדום מטאלי", hex: "#9B2C2C" },
    ],
    images: variants("#4D4D4F", "#9A9A99", "#16161A"),
  },
  {
    slug: "spin-tri-3-lobe",
    name: "SPIN TRI — 3 לוב'ים",
    shortName: "SPIN TRI",
    category: "קלאסי",
    collection: "TRI",
    tag: null,
    price: 79,
    description:
      "הקלאסי שלא מתחרבן. שלושה לוב'ים סימטריים, מיסב פלדה כפול, גימור גומי שלא מחליק מהיד גם בקיץ.",
    features: ["מיסב פלדה כפול", "גימור גומי אנטי-החלקה", "קל ועמיד"],
    fabric: "ABS + ציפוי גומי",
    fit: "סטנדרטי — קוטר 7 ס\"מ",
    sizes: ["סטנדרט 7cm", "מקס 9cm"],
    colors: [
      { name: "שחור גומי",  hex: "#222222" },
      { name: "ירוק נפט",   hex: "#1F4A3F" },
      { name: "כחול לילה",  hex: "#1E2A4A" },
    ],
    images: variants("#222222", "#888888", "#E7E2D7"),
  },
  {
    slug: "spin-penta-5-lobe",
    name: "SPIN PENTA — 5 לוב'ים",
    shortName: "SPIN PENTA",
    category: "פרימיום",
    collection: "PENTA",
    tag: "new",
    price: 99,
    description:
      "חמישה לוב'ים מסביב למיסב היברידי. דחיפה אחת, סיבוב הכי הרמוני שתחווה — תחושה של דיסק ולא של גלגל.",
    features: ["5 לוב'ים סימטריים", "מיסב היברידי", "ציפוי מט נעים"],
    fabric: "אלומיניום + ציפוי מט",
    fit: "פרימיום — קוטר 7.5 ס\"מ",
    sizes: ["סטנדרט 7.5cm"],
    colors: [
      { name: "כסף מט",     hex: "#B0B0B5" },
      { name: "טייטניום",    hex: "#5A5A5F" },
      { name: "רוז גולד",    hex: "#C8907A" },
    ],
    images: variants("#B0B0B5", "#3A3A3F", "#0F0F12"),
  },
];

export const products = PRODUCTS;

export const getProduct = (slug: string) =>
  PRODUCTS.find((p) => p.slug === slug) ?? null;

export const relatedProducts = (slug: string, n = 4) =>
  PRODUCTS.filter((p) => p.slug !== slug).slice(0, n);

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
