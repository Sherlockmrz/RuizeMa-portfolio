"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "./ThemeSwitcher";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080A12]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.1] font-mono text-sm font-semibold text-violet-100 shadow-[0_0_28px_rgba(167,139,250,0.18)]">
            RM
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">
              Ruize Ma
            </span>
            <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 transition group-hover:text-zinc-400">
              AI SYSTEMS LAB
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white",
                  isActive && "bg-white/[0.06] text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeSwitcher />
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-3 py-1.5 font-mono text-xs text-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            backend wrapped
          </span>
          <Link
            href="/projects"
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-violet-300/30 hover:bg-violet-400/[0.08]"
          >
            View systems
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeSwitcher compact />
          <button
            type="button"
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
            className="grid size-10 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-zinc-200"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-white/[0.08] bg-[#080A12]/95 px-5 py-4 md:hidden">
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-3 text-sm font-medium text-zinc-400",
                    isActive && "bg-white/[0.06] text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
