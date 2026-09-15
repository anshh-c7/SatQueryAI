"use client";

import type { AnalyzeResponse } from "@/lib/types/analyze";

interface ReportVisualsProps {
  data: AnalyzeResponse;
}

export function ReportVisuals({ data }: ReportVisualsProps) {
  const evidence = data.visual_evidence;
  const changedPercent = Math.min(100, Math.max(0, (evidence?.changed_pixel_fraction ?? 0) * 100));
  const regionCount = evidence?.region_count ?? 0;
  const regions = evidence?.regions ?? [];
  const inputCount = data.inputs?.length ?? 0;
  const modalityCounts = (data.inputs ?? []).reduce<Record<string, number>>((counts, input) => {
    counts[input.modality] = (counts[input.modality] ?? 0) + 1;
    return counts;
  }, {});
  const modalityEntries = Object.entries(modalityCounts);
  const modalityTotal = modalityEntries.reduce((sum, [, count]) => sum + count, 0) || 1;
  const pieStops = modalityEntries.length === 0
    ? "transparent 0 100%"
    : modalityEntries.map(([modality, count], index) => {
      const colors = ["#C86D3B", "#4F8A8B", "#D6A84F"];
      const start = modalityEntries.slice(0, index).reduce((sum, [, value]) => sum + (value / modalityTotal) * 100, 0);
      const end = start + (count / modalityTotal) * 100;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    }).join(", ");

  return (
    <section className="space-y-4 rounded-2xl border border-stone-300/70 bg-white/65 p-4 shadow-subtle dark:border-white/10 dark:bg-[#171512]/80 sm:p-5">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-secondary">Report visuals</p>
        <h2 className="font-serif text-xl text-primary">Quantitative summary</h2>
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]">
          <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-primary">Evidence region distribution</span><span className="font-mono text-xs text-accent">{changedPercent > 0 ? `${changedPercent.toFixed(2)}% changed` : "No percentage"}</span></div>
          {regions.length > 0 ? <div className="flex h-40 items-end gap-2 overflow-x-auto rounded-lg bg-stone-100/70 px-3 pb-3 pt-5 dark:bg-black/20">{regions.map((region, index) => { const value = region.share_of_all_change * 100; return <div key={index} className="flex min-w-8 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] font-mono text-secondary">{value.toFixed(1)}%</span><div className="w-full rounded-t-md bg-accent/80" style={{ height: `${Math.max(4, Math.min(100, value))}%` }} title={`Region ${index + 1}: ${value.toFixed(1)}% of change`} /></div>; })}</div> : <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-stone-300/70 bg-stone-100/50 px-4 text-center text-xs text-secondary dark:border-white/10 dark:bg-black/20">Not enough region data to create a chart.</div>}
          <div className="mt-2 flex justify-between text-[10px] font-mono text-secondary"><span>Region share of detected change</span><span>{regionCount} region{regionCount === 1 ? "" : "s"}</span></div>
        </div>
        <div className="min-w-0 rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]">
          <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-primary">Input modality mix</span><span className="font-mono text-xs text-secondary">{inputCount} total</span></div>
          <div className="flex items-center gap-4">
            {modalityEntries.length > 0 ? <div className="h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${pieStops})` }} aria-label="Input modality pie chart" role="img" /> : <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-dashed border-stone-300/70 text-center text-[10px] text-secondary dark:border-white/10">Not enough data</div>}
            <div className="min-w-0 space-y-2 text-xs">{modalityEntries.length === 0 ? <span className="text-secondary">No modality data available.</span> : modalityEntries.map(([modality, count], index) => <div key={modality} className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ["#C86D3B", "#4F8A8B", "#D6A84F"][index % 3] }} /><span className="truncate text-secondary">{modality}</span><span className="ml-auto font-mono text-primary">{count}</span></div>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
