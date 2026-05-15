"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

import type { Project } from "@/data/projects";

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-white/[0.08] bg-[#11131F]/80 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur transition-colors hover:border-violet-300/25 hover:bg-[#161927]/80"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            {project.category}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {project.title}
          </h3>
        </div>
        <span className="w-fit rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 font-mono text-xs text-zinc-400">
          {project.demoKey}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-400">{project.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 font-mono text-xs text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {project.metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
            <p className="font-mono text-xs text-zinc-500">{metric.label}</p>
            <p className="mt-2 font-mono text-lg font-semibold text-white">{metric.value}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200"
        >
          View project
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href={`/projects/${project.slug}#demo`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/25 hover:bg-cyan-400/[0.06]"
        >
          <Play className="size-4" />
          Run demo
        </Link>
      </div>
    </motion.article>
  );
}
