import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const AppShell = ({ children, bare = false }: { children: ReactNode; bare?: boolean }) => {
  const { pathname } = useLocation();
  // The chat page has its own header with buttons on top — adding the
  // floating theme toggle there just stacks another button under the
  // status bar. Hide it on /chat; it's available in the settings menu
  // via the top bar on desktop anyway.
  const showFloatingTheme = !pathname.startsWith("/chat");
  return (
    <>
      <div className="stage min-h-screen">
        <TopBar style={{ ["--i" as string]: 0 } as React.CSSProperties} />
        <main
          className="mx-auto w-full"
          style={
            bare
              ? { maxWidth: "100%", padding: 0 }
              : { maxWidth: 1280, padding: "24px 24px 96px" }
          }
        >
          {children}
        </main>
      </div>
      {showFloatingTheme && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            top: "max(40px, calc(12px + env(safe-area-inset-top)))",
            insetInlineEnd: "max(12px, env(safe-area-inset-right))",
            zIndex: 50,
          }}
        >
          <ThemeToggle compact />
        </div>
      )}
      <MobileNav />
    </>
  );
};

export default AppShell;
