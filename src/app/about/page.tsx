import type { Metadata } from "next";

import { MetricCard } from "@/components/MetricCard";
import { ToolCard } from "@/components/ToolCard";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Ruize Ma and the AI systems focus behind the Ruize Ma Portfolio.",
};

const focusMetrics = [
  { label: "Focus", value: "AI", detail: "agent workflows and model reasoning" },
  { label: "Interface", value: "UX", detail: "dashboards for readable systems" },
  { label: "Delivery", value: "fullstack", detail: "Next.js frontend + FastAPI backend" },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            about
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Ruize Ma builds AI systems that can be inspected.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-400">
            This portfolio presents projects as product-like systems rather than static
            screenshots. The goal is to make model behavior legible: what goes in, what
            happens in the middle, what comes out, and where the limits are.
          </p>
          <p className="mt-5 text-base leading-8 text-zinc-400">
            This version uses a Next.js frontend with a FastAPI backend wrapper, so
            the interface can preserve the original project logic while making the
            system traces easier to inspect.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {focusMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
              working style
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Product clarity for technical systems
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {projects.map((project) => (
            <ToolCard key={project.slug} tool={project.tools[0]} />
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          stack
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Next.js App Router", "TypeScript", "Tailwind CSS", "Framer Motion", "lucide-react"].map(
            (item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-zinc-300"
              >
                {item}
              </span>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
