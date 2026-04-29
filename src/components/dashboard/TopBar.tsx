import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const TABS = [
  { label: "דשבורד", to: "/" },
  { label: "לוז", to: "/schedule" },
  { label: "תקציב", to: "/budget" },
  { label: "השקעות", to: "/investments" },
  { label: "שווי נטו", to: "/net-worth" },
  { label: "מטבח", to: "/kitchen" },
  { label: "בריאות", to: "/health" },
  { label: "AI", to: "/chat" },
];

const TopBar = ({ style }: { style?: React.CSSProperties }) => {
  const { pathname } = useLocation();
  return (
    <header className="topbar hidden md:flex" style={style}>
      <div className="flex items-center gap-2">
        <span
          className="font-semibold"
          style={{ fontSize: 14, color: "#F5F6FF", letterSpacing: "-0.01em" }}
        >
          benweb
        </span>
        <span className="holo-logo" aria-hidden />
      </div>

      <nav
        className="segtabs absolute"
        style={{ left: "50%", transform: "translateX(-50%)" }}
        aria-label="Dashboard sections"
      >
        {TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="segtab"
              aria-selected={active}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div
          className="rounded-full"
          style={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, #60A5FA, #A78BFA)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.14)",
          }}
          aria-label="User avatar"
        />
      </div>
    </header>
  );
};

export default TopBar;
