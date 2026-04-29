import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ padding: 24 }}
    >
      <section
        className="glass"
        style={{
          padding: "44px 48px",
          maxWidth: 440,
          textAlign: "center",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1,
            color: "#F5F6FF",
            letterSpacing: "-0.04em",
            textShadow: "0 0 36px rgba(167, 139, 250, 0.45)",
            marginBottom: 18,
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#F5F6FF",
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          הדף לא נמצא
        </h1>
        <p style={{ fontSize: 14, color: "#B4B8D4", marginBottom: 28 }}>
          הנתיב{" "}
          <code
            className="mono"
            style={{
              background: "rgba(255,255,255,0.06)",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 12,
              color: "#F5F6FF",
            }}
          >
            {location.pathname}
          </code>{" "}
          לא קיים.
        </p>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 20px",
            borderRadius: 14,
            background:
              "radial-gradient(circle at 30% 25%, #C4B5FD 0%, #8B5CF6 70%)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(167, 139, 250, 0.4)",
            transition: "transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          חזרה לדשבורד
        </Link>
      </section>
    </div>
  );
};

export default NotFound;
