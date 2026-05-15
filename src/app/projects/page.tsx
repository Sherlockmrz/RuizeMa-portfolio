import type { Metadata } from "next";

import { MetricCard } from "@/components/MetricCard";
import { ProjectCard } from "@/components/ProjectCard";
import { projectStats, projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Featured AI systems projects by Ruize Ma with static demos and inspectable model traces.",
};

export default function ProjectsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
          project index
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          AI systems, reasoning traces, and model dashboards.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">
          Three portfolio projects share one product-style interface: static inputs,
          visible pipeline steps, intermediate results, final outputs, and clear
          limitations.
        </p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Project metrics">
        {projectStats.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </section>
    </main>
  );
}
