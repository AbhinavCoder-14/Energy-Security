"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("aegis-theme", next ? "light" : "dark");
    } catch {
      /* storage blocked, in-session toggle still works */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        mounted
          ? `Switch to ${light ? "dark" : "light"} mode`
          : "Toggle color theme"
      }
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface text-secondary transition-all duration-200 hover:border-hairline-strong hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong active:scale-[0.96]"
    >
      {mounted && light ? (
        <Moon className="h-4 w-4" aria-hidden />
      ) : (
        <Sun className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
