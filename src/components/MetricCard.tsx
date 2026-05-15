import type { Metric } from "@/data/projects";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  metric: Metric;
  className?: string;
};

export function MetricCard({ metric, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {metric.label}
      </p>
      <p className="mt-3 font-mono text-2xl font-semibold text-white">{metric.value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{metric.detail}</p>
    </div>
  );
}
