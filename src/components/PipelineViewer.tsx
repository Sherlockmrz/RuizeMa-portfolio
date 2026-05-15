"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, CircleDot } from "lucide-react";

import type { PipelineStep } from "@/data/projects";
import { cn } from "@/lib/utils";

type PipelineViewerProps = {
  steps: PipelineStep[];
  activeCount?: number;
  reveal?: boolean;
  className?: string;
};

const statusConfig = {
  complete: {
    label: "Complete",
    icon: Check,
    className: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200",
  },
  review: {
    label: "Review",
    icon: CircleDot,
    className: "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200",
  },
  warning: {
    label: "Caveat",
    icon: AlertTriangle,
    className: "border-violet-300/20 bg-violet-400/[0.08] text-violet-200",
  },
} satisfies Record<
  PipelineStep["status"],
  { label: string; icon: typeof Check; className: string }
>;

export function PipelineViewer({
  steps,
  activeCount,
  reveal = false,
  className,
}: PipelineViewerProps) {
  const visibleSteps = reveal ? steps.slice(0, activeCount ?? 0) : steps;

  return (
    <div className={cn("space-y-3", className)}>
      {visibleSteps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.025] p-6 text-sm text-zinc-500">
          Trace ready.
        </div>
      ) : (
        visibleSteps.map((step, index) => {
          const status = statusConfig[step.status];
          const StatusIcon = status.icon;

          return (
            <motion.article
              key={step.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex items-center gap-3 sm:w-52 sm:shrink-0">
                  <span className="grid size-8 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] font-mono text-xs text-violet-200">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    <p className="font-mono text-xs text-zinc-500">{step.tool}</p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px]",
                        status.className,
                      )}
                    >
                      <StatusIcon className="size-3.5" />
                      {status.label}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                      agent trace
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                        Input
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{step.input}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                        Output
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{step.output}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-zinc-400">
                    {step.explanation}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })
      )}
    </div>
  );
}
