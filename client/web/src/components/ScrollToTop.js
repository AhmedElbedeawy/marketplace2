import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If you ever use #anchor links, keep this block; otherwise you can remove it.
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
    }

    // Default: always go to top on navigation - with small delay to ensure page is ready
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 10);
    
    return () => clearTimeout(timer);
  }, [pathname, search, hash]);

  return null;
}
