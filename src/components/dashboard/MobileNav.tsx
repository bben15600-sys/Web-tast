import { NavLink } from "react-router-dom";

const HOME = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-6h-4v6a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V10z" />
  </svg>
);
const CAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
  </svg>
);
const AI = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const WALLET = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M16 12h3" />
    <path d="M3 9c0-1.5 1-3 3-3h11" />
  </svg>
);
const TREND = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
);
const CHEF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 19a4 4 0 0 1-2-7.5 6 6 0 0 1 11.3-3.2A5 5 0 1 1 18 18.5" />
    <path d="M7 20h10" />
  </svg>
);
const HEART = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="ניווט ראשי">
      <NavLink to="/" end className="mobile-nav-item">
        {HOME}
        <span className="mobile-nav-item-label">בית</span>
      </NavLink>
      <NavLink to="/schedule" className="mobile-nav-item">
        {CAL}
        <span className="mobile-nav-item-label">לוז</span>
      </NavLink>
      <NavLink to="/kitchen" className="mobile-nav-item">
        {CHEF}
        <span className="mobile-nav-item-label">מטבח</span>
      </NavLink>
      <NavLink to="/chat" className="mobile-nav-ai" aria-label="AI">
        {AI}
      </NavLink>
      <NavLink to="/health" className="mobile-nav-item">
        {HEART}
        <span className="mobile-nav-item-label">בריאות</span>
      </NavLink>
      <NavLink to="/budget" className="mobile-nav-item">
        {WALLET}
        <span className="mobile-nav-item-label">תקציב</span>
      </NavLink>
      <NavLink to="/investments" className="mobile-nav-item">
        {TREND}
        <span className="mobile-nav-item-label">השקעות</span>
      </NavLink>
    </nav>
  );
}
