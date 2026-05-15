"use client";

import type { InsuranceInput, InsuranceModelType, InsuranceRegion } from "@/data/insurance-demo";
import { modelLabels, regionLabels } from "@/data/insurance-demo";
import { cn } from "@/lib/utils";

type ModelInputPanelProps = {
  value: InsuranceInput;
  onChange: (value: InsuranceInput) => void;
};

const regions = Object.keys(regionLabels) as InsuranceRegion[];
const models = Object.keys(modelLabels) as InsuranceModelType[];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ModelInputPanel({ value, onChange }: ModelInputPanelProps) {
  function update(nextValue: Partial<InsuranceInput>) {
    onChange({ ...value, ...nextValue });
  }

  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            model input
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">Insurance profile</h3>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.08] px-3 py-1 font-mono text-xs text-cyan-200">
          local
        </span>
      </div>

      <div className="mt-5 grid gap-5">
        <label className="grid gap-2">
          <span className="flex items-center justify-between text-sm text-zinc-300">
            Age
            <span className="font-mono text-zinc-500">{value.age}</span>
          </span>
          <input
            type="range"
            min="18"
            max="70"
            value={value.age}
            onChange={(event) => update({ age: Number(event.target.value) })}
            className="accent-violet-300"
          />
        </label>

        <label className="grid gap-2">
          <span className="flex items-center justify-between text-sm text-zinc-300">
            BMI
            <span className="font-mono text-zinc-500">{value.bmi.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min="16"
            max="45"
            step="0.1"
            value={value.bmi}
            onChange={(event) => update({ bmi: Number(event.target.value) })}
            className="accent-violet-300"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Children</span>
            <input
              type="number"
              min="0"
              max="5"
              value={value.children}
              onChange={(event) =>
                update({ children: clamp(Number(event.target.value), 0, 5) })
              }
              className="h-11 rounded-lg border border-white/[0.1] bg-black/20 px-3 font-mono text-sm text-white outline-none transition focus:border-violet-300/40"
            />
          </label>

          <div className="grid gap-2">
            <span className="text-sm text-zinc-300">Smoker status</span>
            <button
              type="button"
              onClick={() => update({ smoker: !value.smoker })}
              className={cn(
                "h-11 rounded-lg border px-3 text-left text-sm font-semibold transition",
                value.smoker
                  ? "border-violet-300/30 bg-violet-400/[0.1] text-violet-100"
                  : "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-100",
              )}
            >
              {value.smoker ? "Smoker" : "Non-smoker"}
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm text-zinc-300">Region</span>
          <div className="grid grid-cols-2 gap-2">
            {regions.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => update({ region })}
                className={cn(
                  "min-h-10 rounded-lg border px-3 text-sm transition",
                  value.region === region
                    ? "border-cyan-300/30 bg-cyan-400/[0.1] text-cyan-100"
                    : "border-white/[0.08] bg-black/20 text-zinc-400 hover:text-zinc-200",
                )}
              >
                {regionLabels[region]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm text-zinc-300">Model type</span>
          <div className="grid gap-2">
            {models.map((modelType) => (
              <button
                key={modelType}
                type="button"
                onClick={() => update({ modelType })}
                className={cn(
                  "min-h-10 rounded-lg border px-3 text-left text-sm transition",
                  value.modelType === modelType
                    ? "border-violet-300/30 bg-violet-400/[0.1] text-violet-100"
                    : "border-white/[0.08] bg-black/20 text-zinc-400 hover:text-zinc-200",
                )}
              >
                {modelLabels[modelType]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
