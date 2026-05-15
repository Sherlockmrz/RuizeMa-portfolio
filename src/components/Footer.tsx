import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#080A12]/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-zinc-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>Ruize Ma Portfolio</p>
        <nav className="flex flex-wrap gap-4" aria-label="Footer navigation">
          <Link href="/" className="transition hover:text-zinc-200">
            Home
          </Link>
          <Link href="/projects" className="transition hover:text-zinc-200">
            Projects
          </Link>
          <Link href="/about" className="transition hover:text-zinc-200">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
