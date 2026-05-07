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

/* ─── Real product photography (verified Unsplash URLs) ─────────── */

const photo = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Catalog of verified spinner photos. */
const PHOTO = {
  brownTri:    "1497040059851-bd928f851c43", // brown 3-blade in hand
  blackHand:   "1514435542839-ed9380d2e9f6", // black spinner in use
  rgbColor:    "1689771585619-9affa87b0937", // multicolored
  redHang:     "1705770581857-8000ec4038f7", // red hanging
  orangeBlur:  "1760507776802-358a3868cbb3", // orange-centred motion
  whiteFlat:   "1589375845324-fe9937f820da", // white 3-blade flat
  yellowSpin:  "1572160443732-cacabe8dddbd", // yellow spinner
  silverRound: "1625842543470-8a49454e6e7d", // silver round
  whiteFrame:  "1589391098324-7ee25cc8d721", // white plastic frame
  whitePlastic:"1589375846044-251c5d655a53", // white plastic round
};

/* ─── Content ─────────────────────────────────────────────────── */

export const heroSlides = [
  {
    eyebrow: "סדרת SPIN PRO 2026",
    title: "תסתובב. תרגע. תתרכז.",
    sub: "ספינרים בעיצוב פרימיום עם מיסבים קרמיים — סיבוב חלק עד 4 דקות, שקט מוחלט, גימור שלא מתנקש בכיס.",
    cta: { label: "קנה לבית", href: "/shop/products?cat=metal" },
    ctaSecondary: { label: "קנה למשרד", href: "/shop/products?tag=new" },
    image: photo(PHOTO.brownTri, 2400),
  },
  {
    eyebrow: "טכנולוגיית CERAMIC CORE",
    title: "השקט שעוזר לך לחשוב.",
    sub: "מיסב קרמי ZrO₂ שמייצר פחות חיכוך ואפס רעש. מתאים לשעות ריכוז ארוכות במשרד או בלימודים.",
    cta: { label: "גלה את הסדרה", href: "/shop/products?cat=metal" },
    image: photo(PHOTO.silverRound, 2400),
  },
] as const;

export const announcements = [
  "משלוח חינם בהזמנות מעל ₪149  ·  החזרה חינם תוך 30 יום",
  "אחריות סיבוב ל-90 יום על כל ספינר",
  "חדש: סדרת SPIN STEEL מפלדת אל-חלד",
  "סטודנטים — 12% הנחה עם אימות",
];

export const categories: Category[] = [
  { slug: "classic", label: "קלאסי",      image: photo(PHOTO.blackHand, 1000) },
  { slug: "led",     label: "LED מואר",   image: photo(PHOTO.rgbColor, 1000) },
  { slug: "metal",   label: "מתכת",       image: photo(PHOTO.silverRound, 1000) },
  { slug: "pocket",  label: "פוקט מיני",  image: photo(PHOTO.redHang, 1000) },
];

export const activities: Activity[] = [
  {
    slug: "office",
    label: "במשרד",
    blurb: "ריכוז עמוק בשיחת זום ארוכה, פחות לחץ בידיים, יותר רעיונות בראש.",
    image: photo(PHOTO.whiteFrame, 1600),
  },
  {
    slug: "home",
    label: "בבית",
    blurb: "פינוק קטן ליום אחרי יום ארוך — שקט שלא מפריע לאף אחד אחר.",
    image: photo(PHOTO.yellowSpin, 1600),
  },
];

const variants = (...ids: string[]): string[] => ids.map((id) => photo(id, 1200));

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
    images: variants(PHOTO.blackHand, PHOTO.brownTri, PHOTO.whitePlastic, PHOTO.whiteFlat),
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
    images: variants(PHOTO.rgbColor, PHOTO.yellowSpin, PHOTO.orangeBlur),
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
    images: variants(PHOTO.silverRound, PHOTO.whiteFrame, PHOTO.whitePlastic),
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
    images: variants(PHOTO.brownTri, PHOTO.yellowSpin, PHOTO.silverRound),
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
    images: variants(PHOTO.redHang, PHOTO.orangeBlur, PHOTO.yellowSpin),
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
    images: variants(PHOTO.whiteFrame, PHOTO.whitePlastic, PHOTO.silverRound),
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
    images: variants(PHOTO.orangeBlur, PHOTO.blackHand, PHOTO.brownTri),
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
    images: variants(PHOTO.whiteFlat, PHOTO.silverRound, PHOTO.whiteFrame),
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
