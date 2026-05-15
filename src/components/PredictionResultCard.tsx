import { TrendingDown, TrendingUp } from "lucide-react";

import type { InsurancePrediction } from "@/data/insurance-demo";
import { cn } from "@/lib/utils";

type PredictionResultCardProps = {
  prediction: InsurancePrediction;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function PredictionResultCard({ prediction }: PredictionResultCardProps) {
  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            predicted annual cost
          </p>
          <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-white">
            {formatCurrency(prediction.predictedAnnualCost)}
          </p>
        </div>
        <span className="w-fit rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1 font-mono text-xs text-violet-200">
          {prediction.confidenceLabel}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          uncertainty range
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-sm text-zinc-300">
          <span>{formatCurrency(prediction.uncertaintyLow)}</span>
          <span className="h-px w-10 bg-gradient-to-r from-violet-300 to-cyan-300" />
          <span>{formatCurrency(prediction.uncertaintyHigh)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {prediction.contributions.map((contribution) => {
          const isUp = contribution.direction === "up";
          const isDown = contribution.direction === "down";
          const Icon = isDown ? TrendingDown : TrendingUp;

          return (
            <div
              key={contribution.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-300">{contribution.label}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-xs",
                    isUp &&
                      "border-violet-300/20 bg-violet-400/[0.08] text-violet-200",
                    isDown &&
                      "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200",
                    !isUp &&
                      !isDown &&
                      "border-white/[0.08] bg-white/[0.04] text-zinc-400",
                  )}
                >
                  <Icon className="size-3" />
                  {contribution.value >= 0 ? "+" : ""}
                  {formatCurrency(contribution.value)}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                {contribution.description}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
