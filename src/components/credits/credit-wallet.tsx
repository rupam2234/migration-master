"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CoinsIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreditWallet({
  balance,
  requiredCredits = 0,
  compact = false,
  onPurchase,
}: {
  balance: number | null;
  requiredCredits?: number;
  compact?: boolean;
  onPurchase?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const available = balance ?? 0;
  const shortfall = Math.max(0, requiredCredits - available);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-primary/15 bg-card text-primary shadow-sm transition-colors hover:bg-primary/[0.04]",
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-xs",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${available} credits available`}
      >
        <CoinsIcon className="h-4 w-4 text-primary/70" aria-hidden="true" />
        {!compact && <span className="hidden text-xs text-primary/60 sm:inline">Credits</span>}
        <span className="font-semibold tabular-nums">
          {balance === null ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-label="Loading credits" /> : available.toLocaleString()}
        </span>
        <ChevronDownIcon className={cn("h-3.5 w-3.5 text-primary/50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-30 w-64 rounded-xl border border-primary/10 bg-card p-3.5 text-left shadow-xl" role="menu">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary/90">Credit wallet</p>
              <p className="text-[11px] text-primary/50">Available for your migrations</p>
            </div>
            <CoinsIcon className="h-5 w-5 text-primary/60" aria-hidden="true" />
          </div>

          <div className="mt-4 rounded-lg bg-primary/[0.04] px-3 py-3">
            <p className="text-xs text-primary/50">Available balance</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-primary/90">
              {balance === null ? "Loading…" : `${available.toLocaleString()} credits`}
            </p>
          </div>

          {requiredCredits > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-primary/50">Needed for this export</span>
              <span className={shortfall > 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                {requiredCredits.toLocaleString()} credits
              </span>
            </div>
          )}

          <div className="mt-4 space-y-2 border-t border-dashed border-primary/15 pt-3">
             <button
               type="button"
               onClick={() => {
                 setOpen(false);
                 onPurchase?.();
               }}
               className="flex w-full items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
               role="menuitem"
             >
               <span className="flex items-center gap-2"><PlusIcon className="h-4 w-4" /> Purchase credits</span>
             </button>
           </div>

           <p className="mt-3 text-[11px] leading-4 text-primary/45">
            Credits are charged only for records you have not exported before.
          </p>
        </div>
      )}
    </div>
  );
}
