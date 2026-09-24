import { Loader2Icon } from "lucide-react";
import { ItemPreview } from "@/components";
import {
  type PipelineState,
} from "./export-config";
import type { ResourceKey } from "@/lib/sharedResources";

/** Sidebar: export summary, generate CTA, reassurance copy, record preview. */
export function ExportSummary({
  pipeline,
  creditExport,
  ctaDisabled,
  onCreditExport,
  selectedCount,
  snapshotError,
  previewItem,
  previewRowNumber,
  resourceKey,
  requiredCredits,
  ownedCount,
  ownershipLoading,
}: {
  pipeline: PipelineState;
  creditExport: PipelineState;
  ctaDisabled: boolean;
  onCreditExport: () => void;
  selectedCount: number;
  snapshotError: string | null;
  previewItem: any | null;
  previewRowNumber: number | null;
  resourceKey: ResourceKey;
  requiredCredits: number;
  ownedCount: number;
  ownershipLoading: boolean;
}) {
  const creditExportBusyLabel =
    creditExport.phase === "processing" ? "Preparing your export…" : null;

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
            <span className="text-primary/55">Total records selected</span>
            <span className="font-semibold text-primary/90">
              {selectedCount.toLocaleString()}
            </span>
          </div>

          {ownedCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary/55">Already exported before</span>
              <span className="font-semibold text-primary/90">
                {ownedCount.toLocaleString()}
              </span>
            </div>
          )}

          <div className="border-t border-dashed border-primary/20 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary/55">Additional credits needed</span>
              <span className="font-semibold text-primary/90">
                {ownershipLoading
                  ? "Checking…"
                  : requiredCredits === 0
                    ? "None"
                    : requiredCredits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-primary/10 px-5 py-4 space-y-3">
          {/* Credit-based Export Button */}
          {(requiredCredits > 0 || (selectedCount > 0 && !ownershipLoading)) && (
            <button
              onClick={onCreditExport}
              disabled={ctaDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creditExportBusyLabel ? (
                <>
                  <Loader2Icon size={16} className="animate-spin" />
                  {creditExportBusyLabel}
                </>
              ) : requiredCredits > 0 ? (
                `Export with ${requiredCredits} credits`
              ) : (
                "Export included records"
              )}
            </button>
          )}
        </div>

        {snapshotError && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {snapshotError}
          </div>
        )}

        {pipeline.phase === "error" && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {pipeline.error}
          </div>
        )}

        {creditExport.phase === "error" && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {creditExport.error}
          </div>
        )}
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
