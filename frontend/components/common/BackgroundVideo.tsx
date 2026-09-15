"use client";

export function BackgroundVideo() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <video
        className="h-full w-full object-cover opacity-[0.15] dark:opacity-[0.19]"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="/BG_Vid.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#FAF6F0]/75 dark:bg-[#0F0E0C]/80" />
    </div>
  );
}
