"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const marketingLinks = [
  { name: "Capabilities", hash: "#features" },
  { name: "Pipeline", hash: "#how-it-works" },
  { name: "Intelligence", hash: "#developers" },
  { name: "Access", hash: "#pricing" },
];

type NavigationProps = {
  /** Force the solid scrolled chrome (used on app pages). */
  solid?: boolean;
};

export function Navigation({ solid = false }: NavigationProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(solid);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const onHome = pathname === "/";
  const showSolid = solid || isScrolled || isMobileMenuOpen;

  useEffect(() => {
    if (solid) {
      setIsScrolled(true);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [solid]);

  const resolveHref = (hash: string) => (onHome ? hash : `/${hash}`);

  return (
    <header
      className={cn(
        "fixed z-50 transition-all duration-500",
        showSolid ? "top-4 left-4 right-4" : "top-0 left-0 right-0",
      )}
    >
      <nav
        className={cn(
          "mx-auto transition-all duration-500",
          showSolid
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-500 px-6 lg:px-8",
            showSolid ? "h-14" : "h-20",
          )}
        >
          <a href="/" className="flex items-center gap-2 group">
            <span
              className={cn(
                "font-display tracking-tight transition-all duration-500",
                showSolid ? "text-xl" : "text-2xl",
              )}
            >
              Aegis Energy
            </span>
            <span
              className={cn(
                "text-muted-foreground font-mono transition-all duration-500",
                showSolid ? "text-[10px] mt-0.5" : "text-xs mt-1",
              )}
            >
              CORE
            </span>
          </a>

          <div className="hidden md:flex items-center gap-10 lg:gap-12">
            {marketingLinks.map((link) => (
              <a
                key={link.name}
                href={resolveHref(link.hash)}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button
              asChild
              size="sm"
              className={cn(
                "rounded-full transition-all duration-500",
                pathname.startsWith("/dashboard")
                  ? "bg-foreground text-background"
                  : "bg-foreground hover:bg-foreground/90 text-background",
                showSolid ? "px-4 h-8 text-xs" : "px-6",
              )}
            >
              <a href="/dashboard">Open War Room</a>
            </Button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      <div
        className={cn(
          "md:hidden fixed inset-0 bg-background z-40 transition-all duration-500",
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        style={{ top: 0 }}
      >
        <div className="flex flex-col h-full px-8 pt-28 pb-8">
          <div className="flex-1 flex flex-col justify-center gap-8">
            {marketingLinks.map((link, i) => (
              <a
                key={link.name}
                href={resolveHref(link.hash)}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "text-5xl font-display text-foreground hover:text-muted-foreground transition-all duration-500",
                  isMobileMenuOpen
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4",
                )}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 75}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div
            className={cn(
              "flex gap-4 pt-8 border-t border-foreground/10 transition-all duration-500",
              isMobileMenuOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4",
            )}
            style={{ transitionDelay: isMobileMenuOpen ? "300ms" : "0ms" }}
          >
            <Button
              asChild
              className="flex-1 bg-foreground text-background rounded-full h-14 text-base"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <a href="/dashboard">Open War Room</a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
