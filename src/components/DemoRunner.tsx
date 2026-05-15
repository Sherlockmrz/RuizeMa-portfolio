"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, Play, RotateCcw } from "lucide-react";

import type { DemoTrace } from "@/data/projects";
import { cn } from "@/lib/utils";
import { PipelineViewer } from "./PipelineViewer";

type DemoRunnerProps = {
  trace: DemoTrace;
  resultSlot?: ReactNode;
  className?: string;
};

export function DemoRunner({ trace, resultSlot, className }: DemoRunnerProps) {
  const [activeCount, setActiveCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const isComplete = activeCount >= trace.steps.length;

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setActiveCount((value) => {
        if (value >= trace.steps.length - 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          return trace.steps.length;
        }

        return value + 1;
      });
    }, 620);

    return () => window.clearInterval(interval);
  }, [isRunning, trace.steps.length]);

  function runDemo() {
    setActiveCount(0);
    setIsRunning(true);
  }

  function resetDemo() {
    setIsRunning(false);
    setActiveCount(0);
  }

  return (
    <section id="demo" className={cn("scroll-mt-24", className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            demo runner
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {trace.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            {trace.scenario}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={runDemo}
            disabled={isRunning}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Play className="size-4" />
            {isRunning ? "Running" : "Run demo"}
          </button>
          <button
            type="button"
            onClick={resetDemo}
            className="grid size-10 place-items-center rounded-lg border border-white/[0.12] bg-white/[0.04] text-zinc-200 transition hover:border-violet-300/30 hover:bg-white/[0.07]"
            aria-label="Reset demo"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-300 transition-all duration-500"
              style={{ width: `${(activeCount / trace.steps.length) * 100}%` }}
            />
          </div>
          <PipelineViewer steps={trace.steps} activeCount={activeCount} reveal />
        </div>

        <div className="space-y-4">
          <article className="rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
              {trace.inputLabel}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{trace.input}</p>
          </article>

          {resultSlot ? (
            resultSlot
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {trace.intermediateResults.map((result) => (
                  <article
                    key={result.label}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4"
                  >
                    <p className="font-mono text-xs text-zinc-500">{result.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{result.value}</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {result.description}
                    </p>
                  </article>
                ))}
              </div>

              <article
                className={cn(
                  "rounded-xl border p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur transition",
                  isComplete
                    ? "border-violet-300/20 bg-violet-400/[0.08]"
                    : "border-white/[0.08] bg-[#11131F]/80",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] text-violet-200">
                    <Activity className="size-4" />
                  </span>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                      final output
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      {trace.finalResult.title}
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  {isComplete
                    ? trace.finalResult.summary
                    : "The final output appears after the trace completes."}
                </p>
                {isComplete ? (
                  <div className="mt-4 grid gap-2">
                    {trace.finalResult.highlights.map((highlight) => (
                      <p
                        key={highlight}
                        className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 font-mono text-xs text-zinc-300"
                      >
                        {highlight}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            </>
          )}

          <article className="rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
              limitations
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">
              {trace.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-300/70" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
