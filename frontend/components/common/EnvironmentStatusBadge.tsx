"use client";

import React, { useEffect, useState } from "react";

export const EnvironmentStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "online" | "offline" | "maintenance">("checking");

  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        let payload: { status?: string } = {};
        try {
          payload = (await res.json()) as { status?: string };
        } catch {
          // A non-JSON response is treated as unavailable below.
        }
        const reportedStatus = payload.status?.toLowerCase() ?? "";
        const isMaintenance = reportedStatus.includes("maintenance");
        if (active) setStatus(isMaintenance ? "maintenance" : res.ok ? "online" : "offline");
      } catch {
        if (active) setStatus("offline");
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    const handleBackendIssue = (event: Event) => {
      const detail = (event as CustomEvent<"offline" | "maintenance">).detail;
      if (active && (detail === "offline" || detail === "maintenance")) setStatus(detail);
    };
    window.addEventListener("satquery-backend-status", handleBackendIssue);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("satquery-backend-status", handleBackendIssue);
    };
  }, []);

  const isLive = status === "online";
  const isMaintenance = status === "maintenance";
  const label = status === "checking" ? "Checking backend health" : isLive ? "Backend connected" : isMaintenance ? "Backend under maintenance" : "Backend offline";

  return (
      <div
        role="status"
        aria-label={label}
        title={label}
        className={`flex h-7 max-w-[90px] items-center gap-1 rounded-full border px-1.5 shadow-subtle transition-colors ${
          status === "checking"
            ? "border-stone-500/20 bg-stone-500/10"
            : isLive
            ? "border-emerald-500/25 bg-emerald-500/10"
            : isMaintenance
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-rose-500/30 bg-rose-500/10"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === "checking"
              ? "bg-stone-400 animate-pulse"
              : isLive
              ? "bg-emerald-500 animate-pulse"
              : isMaintenance
              ? "bg-amber-500"
              : "bg-rose-500"
          }`}
        />
        <span className="truncate whitespace-nowrap text-[8px] font-mono font-semibold uppercase tracking-wide text-primary">{status === "checking" ? "Checking" : isLive ? "Online" : isMaintenance ? "Maintenance" : "Offline"}</span>
      </div>
  );
};
