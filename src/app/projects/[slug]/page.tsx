import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, ExternalLink, FileText, Play, Video } from "lucide-react";

import { BackendRunner } from "@/components/BackendRunner";
import { MetricCard } from "@/components/MetricCard";
import { ToolCard } from "@/components/ToolCard";
import { getProjectBySlug, projects } from "@/data/projects";

type ProjectDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Project Not Found",
    };
  }

  return {
    title: project.title,
    description: project.description,
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <main>
      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
              {project.category}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              {project.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">
              {project.description}
            </p>

            {project.slug === "plan-act-verify-biomedical-reasoning" ? (
              <div className="mt-6 rounded-2xl border border-violet-300/20 bg-violet-400/[0.07] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg border border-violet-300/20 bg-violet-300/[0.12] text-violet-100">
                      <Award className="size-5" />
                    </span>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
                        project credential
                      </p>
                      <p className="mt-1 font-semibold text-white">
                        First Author, MIDI 2025
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a
                      href="https://midi2025.opi.org.pl/wp-content/uploads/2025/12/Plan-Act-Verify-An-Agentic-AI-Question-Answering-and-Reasoning-System-Evaluated-on-the-CURE-Bench-Challenge.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-sm font-semibold text-zinc-100 transition hover:border-violet-300/30 hover:bg-white/[0.07]"
                    >
                      <FileText className="size-4" />
                      Abstract PDF
                    </a>
                    <a
                      href="https://midi2025.opi.org.pl/vr-venue/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.07]"
                    >
                      <Video className="size-4" />
                      MIDI 2025 Venue
                    </a>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#demo"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-300 px-5 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200"
              >
                <Play className="size-4" />
                Run demo
              </Link>
              {project.githubUrl === "#" ? (
                <span className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-semibold text-zinc-400">
                  <ExternalLink className="size-4" />
                  GitHub placeholder
                </span>
              ) : (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-semibold text-zinc-100 transition hover:border-violet-300/30 hover:bg-white/[0.07]"
                >
                  Original GitHub
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {project.metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.08] bg-[#0B0D17]/55">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
          <article className="rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur lg:col-span-2">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
              overview
            </p>
            <p className="mt-4 text-base leading-8 text-zinc-300">{project.overview}</p>
          </article>
          <article className="rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
              role
            </p>
            <p className="mt-4 text-sm leading-7 text-zinc-400">{project.role}</p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <BackendRunner project={project} />
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            architecture flow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Agent and model flow
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            The live pipeline trace appears in the backend runner after execution.
            This section shows the original project components that the backend wraps.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {project.tools.map((tool, index) => (
            <div key={tool.name} className="relative">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] font-mono text-xs text-violet-200">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-violet-300/40 to-transparent" />
              </div>
              <ToolCard tool={tool} />
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.08] bg-[#0B0D17]/55">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
              tools and models
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Components behind the demo
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {project.tools.map((tool) => (
              <ToolCard key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        <article className="rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            example input
          </p>
          <p className="mt-4 text-sm leading-7 text-zinc-300">{project.exampleInput}</p>
        </article>
        <article className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            final result
          </p>
          <p className="mt-4 text-sm leading-7 text-zinc-200">{project.finalResult}</p>
        </article>
        <article className="rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            limitations
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
            {project.limitations.map((limitation) => (
              <li key={limitation} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-300/70" />
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
