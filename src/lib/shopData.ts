// Mock dataset for the Gymshark-inspired storefront.
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

const u = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const heroSlides = [
  {
    eyebrow: "קולקציית קיץ 2026",
    title: "תזרום. תרים. תנצח.",
    sub: "סדרת אימון חדשה מבד טכני שנע איתך — לא נגדך. משלוח חינם בהזמנות מעל ₪249.",
    cta: { label: "קנה לנשים", href: "/shop/products?gender=women" },
    ctaSecondary: { label: "קנה לגברים", href: "/shop/products?gender=men" },
    image: u("1517836357463-d25dfeac3438", 2000),
  },
  {
    eyebrow: "טכנולוגיית FORM",
    title: "בד שמרגיש כמו עור שני.",
    sub: "ייחודי, נושם, וגמיש ב-4 כיוונים. מותאם לאימון אינטנסיבי, לסטודיו וליום-יום.",
    cta: { label: "גלה את הקולקציה", href: "/shop/products?collection=form" },
    image: u("1599058917212-d750089bc07e", 2000),
  },
] as const;

export const announcements = [
  "משלוח חינם מעל ₪249  ·  החזרות חינם",
  "סטודנטים — 12% הנחה עם אימות",
  "השקה: קולקציית FORM החדשה",
  "מועדון לקוחות — נקודות על כל קנייה",
];

export const categories: Category[] = [
  { slug: "running",  label: "ריצה",   image: u("1571019613454-1cb2f99b2d8b", 800) },
  { slug: "lifting",  label: "כוח",    image: u("1581009146145-b5ef050c2e1e", 800) },
  { slug: "hiit",     label: "HIIT",   image: u("1518611012118-696072aa579a", 800) },
  { slug: "pilates",  label: "פילאטיס", image: u("1518310383802-640c2de6a6c1", 800) },
];

export const activities: Activity[] = [
  {
    slug: "studio",
    label: "אימוני סטודיו",
    blurb: "פילאטיס, יוגה, ברה. בד רך, גזרה צמודה, אפס הסחות.",
    image: u("1518310383802-640c2de6a6c1", 1200),
  },
  {
    slug: "outdoor",
    label: "ריצה בחוץ",
    blurb: "אוורור מקסימלי, רפלקטיבי, כיסים שלא קופצים.",
    image: u("1517836357463-d25dfeac3438", 1200),
  },
];

const PRODUCTS: Product[] = [
  {
    slug: "form-seamless-leggings",
    name: "טייץ FORM Seamless ארוך",
    shortName: "טייץ FORM Seamless",
    category: "טייצים",
    collection: "FORM",
    tag: "new",
    price: 269,
    description:
      "הטייץ הכי נמכר שלנו, עכשיו בבד Seamless חלק. תפרים מינימליים, מותן גבוה שלא זז, וחומר שמתאים את עצמו לתנועה — מסקוואט עמוק ועד ריצה ארוכה.",
    features: [
      "מותן גבוה (28 ס\"מ) שלא זז במהלך אימון",
      "בד 4-Way Stretch למקסימום טווח תנועה",
      "תפרים שטוחים שמונעים שפשוף",
      "כיס סמוי במותן",
    ],
    fabric: "73% פוליאמיד · 27% אלסטן",
    fit: "גזרה צמודה (Compressive Fit)",
    sizes: ["XS", "S", "M", "L", "XL"],
    unavailableSizes: ["XS"],
    colors: [
      { name: "שחור פחם", hex: "#111111" },
      { name: "ירוק זית",  hex: "#54614A" },
      { name: "ורוד אבק", hex: "#D5A6A0" },
      { name: "תכלת ערפל", hex: "#A6B8C7" },
    ],
    images: [
      u("1594381898411-846e7d193883", 1200),
      u("1518310383802-640c2de6a6c1", 1200),
      u("1571019613454-1cb2f99b2d8b", 1200),
      u("1517836357463-d25dfeac3438", 1200),
    ],
  },
  {
    slug: "vital-sports-bra",
    name: "חזיית ספורט Vital",
    shortName: "חזיית Vital",
    category: "חזיות ספורט",
    collection: "Vital",
    tag: "bestseller",
    price: 189,
    description:
      "תמיכה בינונית, גזרה Y בגב פתוח, ובד שאוסף לחות. אהובה גם לאימון בעצימות בינונית וגם למעבר ליום.",
    features: [
      "תמיכה בינונית — מתאים ליוגה, פילאטיס וריצה קלה",
      "פדים מובנים שניתנים להוצאה",
      "גזרת Racerback שמשחררת תנועה בכתפיים",
    ],
    fabric: "85% פוליאסטר · 15% אלסטן",
    fit: "Fitted",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "שחור",     hex: "#111111" },
      { name: "לבן רך",   hex: "#F2EFE9" },
      { name: "סגול לילך", hex: "#9B8FB6" },
    ],
    images: [
      u("1594381898411-846e7d193883", 1200),
      u("1518611012118-696072aa579a", 1200),
      u("1581009146145-b5ef050c2e1e", 1200),
    ],
  },
  {
    slug: "crest-oversized-tee",
    name: "טי-שירט Crest אוברסייז",
    shortName: "Crest אוברסייז",
    category: "חולצות",
    collection: "Crest",
    tag: null,
    price: 129,
    oldPrice: 159,
    description:
      "טי-שירט גזרה רחבה מבד כותנה כבד. מתאים גם לאימון סטודיו וגם לסגנון יומיומי. רקמה דיסקרטית של הלוגו על השרוול.",
    features: ["100% כותנה ארוגה כבדה", "צוואר עגול מחוזק", "גזרה Drop-shoulder"],
    fabric: "100% כותנה (240gsm)",
    fit: "Oversized",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "שחור",      hex: "#111111" },
      { name: "אבן",       hex: "#D8CFB6" },
      { name: "אפור גרפיט", hex: "#4D4D4F" },
    ],
    images: [
      u("1521572163474-6864f9cf17ab", 1200),
      u("1503342217505-b0a15ec3261c", 1200),
      u("1583743814966-8936f5b7be1a", 1200),
    ],
  },
  {
    slug: "apex-shorts",
    name: "מכנסי Apex 5\"",
    shortName: "מכנסי Apex",
    category: "מכנסיים קצרים",
    collection: "Apex",
    tag: "new",
    price: 159,
    description:
      "מכנסיים קצרים בבד טכני אולטרה-קל לאימון אינטנסיבי. אוורור רשת בפנים, מותן גמיש ושני כיסים נסתרים.",
    features: [
      "אורך 5'' (12.5 ס\"מ)",
      "ביטנת רשת אוורור פנימית",
      "כיס סמוי במותן + כיס לסמארטפון",
      "רצועות רפלקטיביות לריצת לילה",
    ],
    fabric: "92% פוליאסטר · 8% אלסטן",
    fit: "Athletic",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "שחור",      hex: "#111111" },
      { name: "צבא",       hex: "#3F4A2A" },
      { name: "כחול לילה", hex: "#1E2A4A" },
    ],
    images: [
      u("1517836357463-d25dfeac3438", 1200),
      u("1571019613454-1cb2f99b2d8b", 1200),
    ],
  },
  {
    slug: "studio-jogger",
    name: "ג׳וגר Studio",
    shortName: "ג׳וגר Studio",
    category: "מכנסיים",
    collection: "Studio",
    tag: "bestseller",
    price: 219,
    description:
      "ג׳וגר רך לחימום, להתאוששות וליום אחרי. בד ממוחזר עם מגע סופט-פליז וגומיות בקרסול.",
    features: ["בד ממוחזר 60%", "ביטנת פליז קלה", "כיסים עם רוכסן"],
    fabric: "60% פוליאסטר ממוחזר · 40% כותנה",
    fit: "Tapered",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "אפור",      hex: "#9A9A99" },
      { name: "שחור",      hex: "#111111" },
      { name: "חום קקאו",  hex: "#6E4E3A" },
    ],
    images: [
      u("1594381898411-846e7d193883", 1200),
      u("1521572163474-6864f9cf17ab", 1200),
    ],
  },
  {
    slug: "power-tank",
    name: "גופיית Power Stringer",
    shortName: "גופיית Power",
    category: "גופיות",
    collection: "Power",
    tag: null,
    price: 99,
    description:
      "גופייה קלאסית להרמת משקולות. גזרת Racer-cut שמשחררת את הכתפיים, בד עמיד וגזרה ארוכה.",
    features: ["גזרת Racer-cut פתוחה", "בד 100% כותנה אוורירי"],
    fabric: "100% כותנה",
    fit: "Athletic",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "שחור",  hex: "#111111" },
      { name: "לבן",   hex: "#F2EFE9" },
      { name: "אדום קלאסי", hex: "#A0322B" },
    ],
    images: [
      u("1581009146145-b5ef050c2e1e", 1200),
      u("1583500178690-f8d3e5b51c40", 1200),
    ],
  },
  {
    slug: "everyday-hoodie",
    name: "האודי Everyday",
    shortName: "האודי Everyday",
    category: "פליז",
    collection: "Everyday",
    tag: "sale",
    price: 199,
    oldPrice: 249,
    description:
      "האודי עבה לחורף ולחימום. ביטנת פליז כבדה, כובע מחוזק, וחיתוך עם כיס קנגורו.",
    features: ["בד 380gsm כבד", "כובע דו-שכבתי", "כיס קנגורו רחב"],
    fabric: "80% כותנה · 20% פוליאסטר",
    fit: "Relaxed",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "אפור גרפיט", hex: "#4D4D4F" },
      { name: "שחור",      hex: "#111111" },
      { name: "אבן",       hex: "#D8CFB6" },
    ],
    images: [
      u("1503342217505-b0a15ec3261c", 1200),
      u("1521572163474-6864f9cf17ab", 1200),
    ],
  },
  {
    slug: "elevate-leggings",
    name: "טייץ Elevate High-Rise",
    shortName: "טייץ Elevate",
    category: "טייצים",
    collection: "Elevate",
    tag: null,
    price: 229,
    description:
      "טייץ יומיומי גבוה במותן. בד נושם, מתאים גם לסטודיו וגם להליכה ארוכה.",
    features: ["מותן גבוה 26 ס\"מ", "תפר אחורי מעצב", "כיסים בצד"],
    fabric: "78% פוליאמיד · 22% אלסטן",
    fit: "Compressive",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "שחור",  hex: "#111111" },
      { name: "מוקה",  hex: "#7A5848" },
      { name: "ירוק יער", hex: "#2E4A36" },
    ],
    images: [
      u("1518611012118-696072aa579a", 1200),
      u("1571019613454-1cb2f99b2d8b", 1200),
    ],
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
