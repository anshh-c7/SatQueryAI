"use client";

import { useState } from "react";
import { Maximize2, X, Grid, Image as ImageIcon, Crosshair, BarChart3 } from "lucide-react";
import type { SavedImagePreview } from "@/lib/history";
import type { VisualEvidence } from "@/lib/types/analyze";
import { clsx } from "clsx";

interface ImageWorkspaceProps {
  images: SavedImagePreview[];
  evidence?: VisualEvidence | null;
}

type ViewMode = "grid" | "img0" | "img1" | "evidence";
type PreviewMode = "optical" | "sar" | "multispectral";

const PREVIEW_MODES: { value: PreviewMode; label: string; description: string }[] = [
  { value: "optical", label: "Optical", description: "Natural color" },
  { value: "sar", label: "SAR", description: "Density heatmap" },
  { value: "multispectral", label: "Multispectral", description: "Interference view" },
];

function EvidenceDataSummary({ evidence }: { evidence?: VisualEvidence | null }) {
  const regions = evidence?.regions ?? [];
  const changedPercent = Math.min(100, Math.max(0, (evidence?.changed_pixel_fraction ?? 0) * 100));

  if (!evidence) return null;

  return (
    <section className="mt-4 space-y-3 rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-semibold text-primary">Evidence measurements</h2>
        </div>
        <span className="font-mono text-[10px] text-secondary">{changedPercent.toFixed(2)}% changed</span>
      </div>
      {regions.length > 0 ? (
        <>
          <div className="flex h-32 items-end gap-2 rounded-lg bg-stone-100/70 px-3 pb-3 pt-4 dark:bg-black/20">
            {regions.map((region, index) => {
              const share = Math.max(0, Math.min(100, region.share_of_all_change * 100));
              return (
                <div key={`${region.bbox_pixels.join("-")}-${index}`} className="flex min-w-6 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[9px] font-mono text-secondary">{share.toFixed(1)}%</span>
                  <div className="w-full rounded-t-md bg-accent/80 transition-all duration-300" style={{ height: `${Math.max(4, share)}%` }} title={`Region ${index + 1}: ${share.toFixed(1)}%`} />
                  <span className="text-[9px] font-mono text-secondary">R{index + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto rounded-lg border border-stone-200/70 dark:border-white/10">
            <table className="w-full min-w-[28rem] text-left text-[10px]">
              <thead className="bg-stone-100/80 font-mono text-secondary dark:bg-[#171512]"><tr><th className="px-2 py-1.5">Region</th><th className="px-2 py-1.5">Pixels</th><th className="px-2 py-1.5">Fill</th><th className="px-2 py-1.5">Share of change</th></tr></thead>
              <tbody className="divide-y divide-stone-200/70 dark:divide-white/10">
                {regions.map((region, index) => <tr key={`row-${region.bbox_pixels.join("-")}-${index}`}><th className="px-2 py-1.5 font-medium text-secondary">R{index + 1}</th><td className="px-2 py-1.5 text-primary">{region.area_pixels.toLocaleString()}</td><td className="px-2 py-1.5 text-primary">{(region.fill_fraction * 100).toFixed(1)}%</td><td className="px-2 py-1.5 text-primary">{(region.share_of_all_change * 100).toFixed(1)}%</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-stone-300/70 p-4 text-center text-xs text-secondary dark:border-white/10">No region measurements were returned for this analysis.</p>
      )}
    </section>
  );
}

export function ImageWorkspace({ images, evidence }: ImageWorkspaceProps) {
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeMode, setActiveMode] = useState<PreviewMode>("optical");

  const overlay = evidence?.overlay_png_base64
    ? `data:image/png;base64,${evidence.overlay_png_base64}`
    : null;
  const imageFilter = activeMode === "sar"
    ? "contrast(1.6) brightness(1.1) saturate(1.8) url(#sar-color-map)"
    : activeMode === "multispectral"
      ? "contrast(2.5) brightness(0.55) saturate(1.5)"
      : "none";

  if (images.length === 0 && !overlay) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-stone-300/70 p-6 text-center text-sm text-secondary dark:border-white/10">
        No visual input was saved for this response.
      </div>
    );
  }

  const TabButton = ({
    mode,
    label,
    icon: Icon,
    disabled = false,
  }: {
    mode: ViewMode;
    label: string;
    icon: any;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setViewMode(mode)}
      className={clsx(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200",
        viewMode === mode
          ? "bg-[#1C1917] text-white shadow-sm dark:bg-white dark:text-black"
          : "text-secondary hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </button>
  );

  return (
    <section className="flex min-h-0 h-full flex-col gap-3 rounded-2xl border border-stone-300/70 bg-white/45 p-3 shadow-subtle dark:border-white/10 dark:bg-[#171512]/70">
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="sar-color-map" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="1.8" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.16 0.98" />
              <feFuncG type="table" tableValues="0.01 1" />
              <feFuncB type="table" tableValues="0.04 0.08" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-xl text-primary">Visual workspace</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-secondary">
              Geospatial Inspector
            </p>
          </div>
          {overlay && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-mono text-accent animate-pulse">
              Evidence Ready
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-stone-200/50 dark:bg-black/20 p-1 rounded-xl w-fit">
          <TabButton mode="grid" label="All" icon={Grid} />
          {images.length > 0 && (
            <TabButton mode="img0" label="Image 1" icon={ImageIcon} />
          )}
          {images.length > 1 && (
            <TabButton mode="img1" label="Image 2" icon={ImageIcon} />
          )}
          <TabButton
            mode="evidence"
            label="Evidence"
            icon={Crosshair}
            disabled={!overlay}
          />
        </div>
        <label className="flex w-fit items-center gap-2 rounded-lg border border-stone-300/70 bg-white/65 px-2.5 py-1.5 text-[11px] text-secondary shadow-sm dark:border-white/10 dark:bg-[#171512]">
          <span className="font-mono uppercase tracking-wide">Preview mode</span>
          <select value={activeMode} onChange={(event) => setActiveMode(event.target.value as PreviewMode)} className="cursor-pointer bg-transparent font-semibold text-primary outline-none" aria-label="Image preview mode">
            {PREVIEW_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label} - {mode.description}</option>)}
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {/* Grid View */}
        {viewMode === "grid" && (
          <div className={clsx("grid gap-3", images.length + (overlay ? 1 : 0) > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {images.map((image, idx) => (
              <figure
                key={image.filename}
                className="group relative overflow-hidden rounded-xl border border-stone-200 bg-black/5 dark:border-white/10 dark:bg-black/20"
              >
                <div className="relative">
                  <img src={image.data_url} alt={image.filename} className="aspect-square w-full object-cover transition-all duration-300 ease-in-out group-hover:scale-105" style={{ filter: imageFilter }} />
                  {activeMode === "multispectral" && <div className="multispectral-overlay absolute inset-0" aria-hidden="true" />}
                </div>
                <button
                  type="button"
                  onClick={() => setFullscreen(image.data_url)}
                  className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100 backdrop-blur-md"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md px-3 py-1.5 text-[10px] font-mono text-white flex justify-between items-center translate-y-full group-hover:translate-y-0 transition-transform">
                  <span className="truncate">{image.filename}</span>
                  <span className="text-white/60">IMG_{idx + 1}</span>
                </div>
              </figure>
            ))}
            {overlay && (
              <figure className="group relative overflow-hidden rounded-xl border-2 border-accent bg-black shadow-[0_0_15px_rgba(200,109,59,0.2)]">
                <img
                  src={overlay}
                  alt="Boundary evidence"
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFullscreen(overlay)}
                  className="absolute right-2 top-2 rounded-md bg-accent/80 p-1.5 text-white backdrop-blur-md"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-accent/80 backdrop-blur-md px-3 py-1.5 text-[10px] font-mono text-white">
                  DIFFERENCE_OVERLAY
                </div>
              </figure>
            )}
          </div>
        )}

        {/* Individual Image Views */}
        {viewMode === "img0" && images[0] && (
          <figure className="relative h-full flex flex-col rounded-xl overflow-hidden border border-stone-200 dark:border-white/10 bg-black/5">
            <img
              src={images[0].data_url}
              className="flex-1 w-full object-contain bg-black/20 transition-all duration-300 ease-in-out"
              style={{ filter: imageFilter }}
              alt={images[0].filename}
            />
            {activeMode === "multispectral" && <div className="multispectral-overlay pointer-events-none absolute inset-0" aria-hidden="true" />}
            <div className="bg-white/90 dark:bg-[#1F1B17] px-4 py-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center">
              <span className="text-xs font-mono text-secondary">{images[0].filename}</span>
              <button onClick={() => setFullscreen(images[0].data_url)} className="text-accent hover:text-accent/80 transition-colors"><Maximize2 className="w-4 h-4"/></button>
            </div>
          </figure>
        )}

        {viewMode === "img1" && images[1] && (
          <figure className="relative h-full flex flex-col rounded-xl overflow-hidden border border-stone-200 dark:border-white/10 bg-black/5">
            <img
              src={images[1].data_url}
              className="flex-1 w-full object-contain bg-black/20 transition-all duration-300 ease-in-out"
              style={{ filter: imageFilter }}
              alt={images[1].filename}
            />
            {activeMode === "multispectral" && <div className="multispectral-overlay pointer-events-none absolute inset-0" aria-hidden="true" />}
            <div className="bg-white/90 dark:bg-[#1F1B17] px-4 py-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center">
              <span className="text-xs font-mono text-secondary">{images[1].filename}</span>
              <button onClick={() => setFullscreen(images[1].data_url)} className="text-accent hover:text-accent/80 transition-colors"><Maximize2 className="w-4 h-4"/></button>
            </div>
          </figure>
        )}

        {viewMode === "evidence" && overlay && (
          <figure className="relative h-full flex flex-col rounded-xl overflow-hidden border-2 border-accent bg-black">
            <img
              src={overlay}
              className="flex-1 w-full object-contain"
              alt="Visual evidence"
            />
            <div className="bg-accent px-4 py-3 flex justify-between items-center text-white">
              <span className="text-xs font-mono font-medium">RADIOMETRIC_DIFFERENCE_MAP</span>
              <button onClick={() => setFullscreen(overlay)} className="hover:scale-110 transition-transform"><Maximize2 className="w-4 h-4"/></button>
            </div>
          </figure>
        )}

        <EvidenceDataSummary evidence={evidence} />
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-10 transition-all duration-300 animate-in fade-in"
          onClick={() => setFullscreen(null)}
        >
          <button
            type="button"
            className="absolute right-6 top-6 z-[1001] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors border border-white/10"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(null);
            }}
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative h-full w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreen}
              alt="Fullscreen view"
              className="max-h-full max-w-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300"
            />
          </div>
        </div>
      )}
    </section>
  );
}

