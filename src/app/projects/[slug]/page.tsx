import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";

import { DemoRunner } from "@/components/DemoRunner";
import { InsurancePredictor } from "@/components/InsurancePredictor";
import { MetricCard } from "@/components/MetricCard";
import { PipelineViewer } from "@/components/PipelineViewer";
import { ToolCard } from "@/components/ToolCard";
import { demoTraces } from "@/data/demo-traces";
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

  const trace = demoTraces[project.demoKey];
  const isInsurance = project.demoKey === "insurance";

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
                  GitHub
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
        <DemoRunner
          trace={trace}
          resultSlot={isInsurance ? <InsurancePredictor /> : undefined}
        />
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            pipeline flow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Model and agent steps
          </h2>
        </div>
        <PipelineViewer steps={trace.steps} />
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
