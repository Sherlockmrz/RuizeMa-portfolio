import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FloatingAIAssistant } from "@/components/FloatingAIAssistant";
import { Hero } from "@/components/Hero";
import { ProjectCard } from "@/components/ProjectCard";
import { ToolCard } from "@/components/ToolCard";
import { projectStats, projects } from "@/data/projects";

export default function Home() {
  return (
    <main>
      <FloatingAIAssistant />
      <Hero projects={projects} stats={projectStats} />

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
              featured work
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Systems with inspectable demos
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Each project calls a FastAPI wrapper that either recomputes with the
              original code path or exposes provenance-backed original artifacts when
              live dependencies are unavailable.
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:border-violet-300/30 hover:bg-white/[0.07]"
          >
            All projects
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.08] bg-[#0B0D17]/60">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="lg:col-span-1">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
              build principles
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Calm, visible system behavior
            </h2>
          </div>
          <div className="grid gap-4 lg:col-span-3 lg:grid-cols-3">
            {projects[0].tools.slice(0, 3).map((tool) => (
              <ToolCard key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
