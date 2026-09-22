import { ArrowRight, InfoIcon } from "lucide-react";
import { ToolTip } from "@/components";
import type { ExportDirection } from "./export-config";

/** Page title block: icon, resource name, direction chips, record counts. */
export function ExportHeader({
  icon: Icon,
  resourceLabel,
  direction,
  total,
  selectedCount,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  resourceLabel: string;
  direction: ExportDirection;
  total: number;
  selectedCount: number;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5">
          {Icon ? <Icon size={20} className="text-primary/70" /> : null}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-primary/90">
              Export {resourceLabel}
            </h1>

            <ToolTip
              content={
                <div className="max-w-xs space-y-2 text-xs">
                  <p className="font-semibold text-orange-400">
                    Selection &amp; pricing
                  </p>
                  <p className="pt-2">
                    Items you&apos;ve already paid for (or received free) are
                    never charged again, even if your current selection also
                    includes new items.
                  </p>
                </div>
              }
              trigger={
                <InfoIcon size={15} className="shrink-0 text-primary/35" />
              }
              side="bottom"
            />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-primary/50">
            <span className="rounded-md border border-primary/10 bg-primary/5 px-1.5 py-0.5 font-medium text-primary/60">
              {direction === "shopify_to_wp" ? "Shopify" : "WordPress"}
            </span>
            <ArrowRight size={13} className="text-primary/30" />
            <span className="rounded-md border border-primary/10 bg-primary/5 px-1.5 py-0.5 font-medium text-primary/60">
              {direction === "shopify_to_wp" ? "WordPress" : "Shopify"}
            </span>

            <span className="mx-1 hidden h-3 w-px bg-primary/15 sm:block" />

            <span>
              {total.toLocaleString()} record{total !== 1 ? "s" : ""}
            </span>

            {selectedCount > 0 && (
              <span className="font-medium text-blue-600">
                · {selectedCount.toLocaleString()} selected
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
