import type { Accent, ToolModel } from "@/data/projects";
import { cn } from "@/lib/utils";

const accentStyles: Record<Accent, string> = {
  purple: "border-violet-300/20 bg-violet-400/[0.08] text-violet-200",
  indigo: "border-indigo-300/20 bg-indigo-400/[0.08] text-indigo-200",
  cyan: "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200",
  green: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200",
};

type ToolCardProps = {
  tool: ToolModel;
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-violet-300/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            {tool.type}
          </p>
          <h3 className="mt-2 text-base font-semibold text-white">{tool.name}</h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 font-mono text-xs",
            accentStyles[tool.accent],
          )}
        >
          {tool.signal}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-400">{tool.description}</p>
    </article>
  );
}
