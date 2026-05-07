import { useEffect, useState } from "react";
import { announcements } from "@/lib/shopData";

export function AnnouncementBar() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % announcements.length), 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="shop-announce" aria-live="polite">
      <span>{announcements[i]}</span>
    </div>
  );
}
