import type { PdfIndexProgress, PdfIndexStatus } from "../../../shared/indexing";

interface PdfIndexStatusBadgeProps {
  progress: PdfIndexProgress | null;
}

const statusLabel: Record<PdfIndexStatus, string> = {
  "not-indexed": "Not indexed",
  "waiting-for-api-key": "Waiting for API key",
  queued: "Queued",
  indexing: "Indexing",
  ready: "Ready",
  failed: "Failed",
  cancelled: "Cancelled",
  stale: "Stale",
  missing: "Missing"
};

const statusTone: Record<PdfIndexStatus, string> = {
  "not-indexed": "border-zinc-600 bg-zinc-900 text-zinc-300",
  "waiting-for-api-key": "border-amber-400/40 bg-amber-400/10 text-amber-200",
  queued: "border-cyan-400/35 bg-cyan-400/10 text-cyan-200",
  indexing: "border-teal-400/40 bg-teal-400/10 text-teal-200",
  ready: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
  failed: "border-red-400/40 bg-red-500/10 text-red-200",
  cancelled: "border-zinc-500 bg-zinc-900 text-zinc-300",
  stale: "border-orange-400/40 bg-orange-400/10 text-orange-200",
  missing: "border-zinc-500 bg-zinc-900 text-zinc-300"
};

export const getIndexProgressLabel = (progress: PdfIndexProgress | null): string => {
  if (!progress) {
    return statusLabel["not-indexed"];
  }

  if (progress.status === "indexing") {
    if (!progress.pageCount) {
      return "Preparing...";
    }

    const percent = Math.round((progress.indexedPageCount / progress.pageCount) * 100);
    return `Indexing ${percent}%`;
  }

  return statusLabel[progress.status];
};

const PdfIndexStatusBadge = ({ progress }: PdfIndexStatusBadgeProps): JSX.Element => {
  const status = progress?.status ?? "not-indexed";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm shadow-zinc-950/10 ${statusTone[status]}`}
    >
      {getIndexProgressLabel(progress)}
    </span>
  );
};

export default PdfIndexStatusBadge;
