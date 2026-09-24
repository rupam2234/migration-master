"use client";

import { useEffect, useState } from "react";
import { FolderOpen, PackageOpen } from "lucide-react";
import { useProjectContext } from "@/context";
import { useParams } from "next/navigation";
import { GlobalLoader } from "@/components";
import { CreditPurchaseModal } from "./credit-purchase-modal";
import { RESOURCE_CONFIG, ResourceKey } from "@/lib/sharedResources";
import { EmptyState } from "./empty-state";
import { ExportHeader } from "./export-header";
import { ExportSummary } from "./export-summary";
import { RecordsPanel } from "./records-panel";
import { EXPORT_PAGE_SIZE, formatCell, truncateCell } from "./export-config";
import { useExportRecords } from "./use-export-records";
import { useExportPipeline } from "./use-export-pipeline";
import { useCreditExport } from "./use-credit-export";

export default function ExportResources() {
  const params = useParams();
  const { activeProject } = useProjectContext();
  const resourceKey = (params.resources as string).toUpperCase() as ResourceKey;
  const resourceParam = (params.resources as string).toLowerCase();

  const [page, setPage] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);

  const records = useExportRecords({ activeProject, resourceKey, resourceParam });

  const pipeline = useExportPipeline({
    activeProject,
    resourceKey,
    resourceParam,
    direction: records.exportDirection,
    snapshot: records.snapshot,
    records: records.records,
    selected: records.selected,
    includeAll: records.includeAll,
    allRecordIds: records.allRecordIds,
    search: records.search,
  });

  // Credit-based export pipeline
  const creditExport = useCreditExport({
    activeProject,
    resourceKey,
    resourceParam,
    direction: records.exportDirection,
    snapshot: records.snapshot,
    records: records.records,
    selected: records.selected,
    includeAll: records.includeAll,
    allRecordIds: records.allRecordIds,
    search: records.search,
    requiredCredits: records.ownership.newCount,
  });

  const ResourceIcon = RESOURCE_CONFIG[resourceKey]?.icon;

  // Reset view state when the record set changes.
  useEffect(() => {
    setPage(0);
    setPreviewIndex(0);
  }, [records.records]);

  // Required credits are calculated from records that have not already been
  // exported for this project and resource.
  // ---------------- row selection helpers ----------------

  const totalPages = Math.max(1, Math.ceil(records.filtered.length / EXPORT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleGlobalIndices = Array.from(
    { length: Math.min(EXPORT_PAGE_SIZE, Math.max(0, records.filtered.length - safePage * EXPORT_PAGE_SIZE)) },
    (_, i) => safePage * EXPORT_PAGE_SIZE + i,
  );
  const allVisibleSelected =
    visibleGlobalIndices.length > 0 &&
    visibleGlobalIndices.every((i) => records.selected.has(i));

  const handleSearch = (value: string) => {
    records.handleSearch(value);
    setPage(0);
  };

  const toggleRow = (globalIndex: number) => {
    records.setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
      return next;
    });
  };

  const toggleAll = () => {
    records.setSelected((prev) => {
      const next = new Set(prev);
      visibleGlobalIndices.forEach((i) =>
        allVisibleSelected ? next.delete(i) : next.add(i),
      );
      return next;
    });
  };

  const selectAllFiltered = () =>
    records.setSelected(new Set(records.filtered.map((_, i) => i)));

  const clearSelection = () => {
    records.setSelected(new Set());
    records.setIncludeAll(false);
  };

  // ---------------- early exits ----------------

  if (records.initialLoading && !records.records.length) {
    return <GlobalLoader />;
  }

  if (!activeProject) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project selected"
        description="Pick a project from the top bar to view its exportable records."
      />
    );
  }

  if (!records.records.length && !records.initialLoading) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={`No ${params.resources as string} loaded`}
        description="Fetch this resource from the dashboard first, then come back here to prepare its import file."
      />
    );
  }

  // ---------------- derived view values ----------------

  const previewItem =
    records.filtered[safePage * EXPORT_PAGE_SIZE + previewIndex] ?? null;
  const previewRowNumber = previewItem
    ? safePage * EXPORT_PAGE_SIZE + previewIndex + 1
    : null;

  const pipelineBusy = pipeline.busy || pipeline.running;
  const creditExportBusy = creditExport.busy || creditExport.running;
  const snapshotReady = records.snapshotReady;
  const ctaDisabled =
    pipelineBusy ||
    creditExportBusy ||
    records.idsLoading ||
    records.ownershipLoading ||
    !snapshotReady ||
    records.selectedCount === 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <ExportHeader
        icon={ResourceIcon as React.ComponentType<{ size?: number; className?: string }> | undefined}
        resourceLabel={RESOURCE_CONFIG[resourceKey]?.label ?? resourceKey}
        direction={records.exportDirection}
        total={records.snapshot?.total ?? records.records.length}
        selectedCount={records.selectedCount}
        requiredCredits={records.ownership.newCount}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <RecordsPanel
          columns={records.columns}
          filtered={records.filtered}
          search={records.search}
          onSearch={handleSearch}
          page={safePage}
          onPage={(next) => {
            setPage(next);
            setPreviewIndex(0);
          }}
          previewIndex={previewIndex}
          onPreview={setPreviewIndex}
          selected={records.selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          onSelectAllFiltered={selectAllFiltered}
          onClearSelection={clearSelection}
          allVisibleSelected={allVisibleSelected}
          hasUnshownRecords={records.hasUnshownRecords}
          shownCount={records.records.length}
          snapshotTotal={records.snapshot?.total ?? records.records.length}
          includeAll={records.includeAll}
          idsLoading={records.idsLoading}
          onToggleIncludeAll={() => records.setIncludeAll(!records.includeAll)}
          refreshing={records.refreshing}
          busy={pipelineBusy || creditExportBusy}
          onRefresh={records.refreshSnapshot}
          formatCell={formatCell}
          truncate={truncateCell}
        />

        <ExportSummary
          pipeline={pipeline.pipeline}
          creditExport={creditExport.pipeline}
          ctaDisabled={ctaDisabled}
          onCreditExport={async () => {
            if (!snapshotReady) return;

            try {
              await creditExport.run();
            } catch (error: any) {
              // The hook now handles insufficient credits by showing the modal
              // No need to handle it here
              console.error("Export failed:", error);
            }
          }}
          selectedCount={records.selectedCount}
          snapshotError={records.snapshotError}
          previewItem={previewItem}
          previewRowNumber={previewRowNumber}
          resourceKey={resourceKey}
          requiredCredits={records.ownership.newCount}
          ownedCount={records.ownership.ownedCount}
          ownershipLoading={records.ownershipLoading}
        />
      </div>

      <CreditPurchaseModal
        open={creditExport.showPurchaseModal}
        onOpenChange={(open) => {
          creditExport.setShowPurchaseModal(open);
          if (!open && !creditExport.busy) creditExport.cancel();
        }}
        requiredCredits={records.ownership.newCount}
        onPaymentCancelled={creditExport.cancel}
        onPaymentSuccess={async (transactionId) => {
          creditExport.setShowPurchaseModal(false);
          await creditExport.run(transactionId);
        }}
      />
    </div>
  );
}
