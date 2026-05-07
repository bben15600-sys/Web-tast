import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { heroSlides } from "@/lib/shopData";

export function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % heroSlides.length), 7000);
    return () => clearInterval(id);
  }, []);
  const slide = heroSlides[i];

  return (
    <section className="shop-hero" aria-label="קמפיין">
      <img src={slide.image} alt="" />
      <div className="shop-hero-overlay" aria-hidden />
      <div className="shop-hero-inner">
        <p className="shop-hero-eyebrow">{slide.eyebrow}</p>
        <h1 className="shop-hero-title">{slide.title}</h1>
        <p className="shop-hero-sub">{slide.sub}</p>
        <div className="shop-hero-ctas">
          <Link to={slide.cta.href} className="shop-btn shop-btn-primary">
            {slide.cta.label}
          </Link>
          {"ctaSecondary" in slide && slide.ctaSecondary && (
            <Link to={slide.ctaSecondary.href} className="shop-btn shop-btn-outline">
              {slide.ctaSecondary.label}
            </Link>
          )}
        </div>

        <div className="absolute bottom-6 inset-inline-end-6 flex gap-2 z-[3]">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              aria-label={`עבור לשקופית ${idx + 1}`}
              onClick={() => setI(idx)}
              className="w-8 h-1 transition-colors"
              style={{ background: idx === i ? "#fff" : "rgba(255,255,255,0.4)" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
