"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Brain, LineChart, ShieldCheck } from "lucide-react";

import type { Metric, Project } from "@/data/projects";
import { MetricCard } from "./MetricCard";

type HeroProps = {
  projects: Project[];
  stats: Metric[];
};

const iconMap = [Bot, Brain, LineChart];

export function Hero({ projects, stats }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-[-18rem] h-[34rem] bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.24),rgba(99,102,241,0.08)_34%,transparent_68%)]" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 pb-16 pt-20 sm:px-6 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1.5 font-mono text-xs text-violet-100">
              <ShieldCheck className="size-3.5" />
              original logic
            </span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-3 py-1.5 font-mono text-xs text-cyan-100">
              FastAPI wrapper
            </span>
            <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-zinc-300">
              provenance shown
            </span>
          </div>

          <p className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-violet-200/80">
            Ruize Ma
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            AI Agent Systems Portfolio
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            A polished portfolio for agent workflows, biomedical reasoning, and
            predictive modeling, presented as calm product-grade system dashboards
            backed by the original project code and artifacts.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/projects"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-300 px-5 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200"
            >
              View projects
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-semibold text-zinc-100 transition hover:border-violet-300/30 hover:bg-white/[0.07]"
            >
              About Ruize
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {stats.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }}
          className="rounded-2xl border border-white/[0.08] bg-[#11131F]/70 p-4 shadow-[0_24px_100px_rgba(0,0,0,0.36)] backdrop-blur-xl lg:mt-8"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                system overview
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">Portfolio console</h2>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-3 py-1 font-mono text-xs text-emerald-200">
              v1
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {projects.map((project, index) => {
              const Icon = iconMap[index] ?? Bot;

              return (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group rounded-xl border border-white/[0.08] bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-violet-300/25 hover:bg-violet-400/[0.05]"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid size-10 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-violet-200">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-white">{project.shortTitle}</h3>
                        <span className="font-mono text-xs text-zinc-500">
                          {project.category}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {project.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
