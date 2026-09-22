import { Loader2Icon, ShieldCheck } from "lucide-react";
import { ItemPreview } from "@/components";
import {
  ctaLabel,
  outputFormatLabel,
  pipelineBusyLabel,
  type ExportDirection,
  type PipelineState,
} from "./export-config";
import type { ResourceKey } from "@/lib/sharedResources";

/** Sidebar: export summary, generate CTA, reassurance copy, record preview. */
export function ExportSummary({
  direction,
  pipeline,
  checkingEligibility,
  ctaDisabled,
  onStart,
  selectedCount,
  snapshotError,
  previewItem,
  previewRowNumber,
  resourceKey,
}: {
  direction: ExportDirection;
  pipeline: PipelineState;
  checkingEligibility: boolean;
  ctaDisabled: boolean;
  onStart: () => void;
  selectedCount: number;
  snapshotError: string | null;
  previewItem: any | null;
  previewRowNumber: number | null;
  resourceKey: ResourceKey;
}) {
  const busyLabel = pipelineBusyLabel(pipeline, checkingEligibility);

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-5">
      <div className="flex flex-col rounded-sm border border-primary/10 bg-background shadow-sm">
        <div className="border-b border-primary/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-primary/90">
            Export summary
          </h3>
          <p className="mt-0.5 text-xs text-primary/45">
            Review before generating your import files
          </p>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary/55">Records selected</span>
            <span className="font-semibold text-primary/90">
              {selectedCount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-primary/55">Output format</span>
            <span className="font-medium text-primary/80">
              {outputFormatLabel(direction)}
            </span>
          </div>
        </div>

        <div className="border-t border-primary/10 px-5 py-4">
          <button
            onClick={onStart}
            disabled={ctaDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyLabel ? (
              <>
                <Loader2Icon size={16} className="animate-spin" />
                {busyLabel}
              </>
            ) : (
              ctaLabel(direction, selectedCount)
            )}
          </button>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-primary/40">
            <ShieldCheck
              size={13}
              className="mt-0.5 shrink-0 text-emerald-500"
            />
            Files are prepared on our servers and stay private to your account.
            Re-exports of paid items are always free.
          </p>

          {snapshotError && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {snapshotError}
            </div>
          )}

          {pipeline.phase === "error" && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {pipeline.error} — select the records and try again.
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-primary/10 bg-background shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-primary/90">
            Record preview
          </h3>

          {previewRowNumber !== null && (
            <span className="text-[11px] tabular-nums text-primary/40">
              Row {previewRowNumber.toLocaleString()}
            </span>
          )}
        </div>

        <ItemPreview item={previewItem} resource={resourceKey} />
      </div>
    </aside>
  );
}
