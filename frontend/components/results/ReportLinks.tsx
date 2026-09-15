"use client";

import React from "react";
import { FileText, Download } from "lucide-react";
import type { ReportLinks as ReportLinksType } from "@/lib/types/analyze";
import { downloadConversationPdf, type PdfConversationTurn } from "@/lib/conversationPdf";

interface ReportLinksProps {
  report: ReportLinksType;
  conversation?: PdfConversationTurn[];
}

export const ReportLinks: React.FC<ReportLinksProps> = ({ report, conversation }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-100/80 p-3 dark:border-white/10 dark:bg-[#1C1917]">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs"><FileText className="h-4 w-4 shrink-0 text-accent" /><span className="truncate font-semibold text-primary">Export this analysis</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/analysis/${report.report_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="apple-interactive px-3 py-1.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-primary hover:bg-stone-300 dark:hover:bg-stone-700 font-medium flex items-center gap-1.5 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View Report</span>
        </a>

        <button
          type="button"
          onClick={() => downloadConversationPdf(conversation ?? [])}
          className="apple-interactive px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 font-medium flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>

      </div>
    </div>
  );
};
