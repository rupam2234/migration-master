import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MinusCircle,
  TagIcon,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/** One row of GET /api/export-jobs - list and detail folded into one payload. */
export interface ExportJob {
  id: string;
  item_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  coupon_code: string | null;
  coupon_percent: number | string | null;
  exported_count: number;
  razorpay_payment_id: string | null;
}

type StatusTone = "success" | "free" | "pending" | "failed" | "unknown";

/** Pill tones follow the settings-page standard (bordered, soft-tinted). */
const STATUS_TONES: Record<StatusTone, { className: string; Icon: LucideIcon }> =
  {
    success: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      Icon: CheckCircle2,
    },
    free: {
      className: "border-primary/20 bg-primary/10 text-primary",
      Icon: CheckCircle2,
    },
    pending: {
      className: "border-amber-200 bg-amber-50 text-amber-700",
      Icon: Clock,
    },
    failed: {
      className: "border-red-200 bg-red-50 text-red-700",
      Icon: XCircle,
    },
    unknown: {
      className: "border-border bg-muted text-muted-foreground",
      Icon: MinusCircle,
    },
  };

function statusTone(status: string): StatusTone {
  switch (status.trim().toUpperCase()) {
    case "PAID":
    case "READY":
    case "COMPLETED":
    case "COMPLETE":
    case "SUCCESS":
    case "DONE":
      return "success";
    case "FREE":
      return "free";
    case "PROCESSING":
    case "PENDING":
    case "AWAITING_DATA":
    case "QUEUED":
    case "RUNNING":
      return "pending";
    case "FAILED":
    case "ERROR":
    case "CANCELLED":
      return "failed";
    default:
      return "unknown";
  }
}

export function StatusPill({ status }: { status: string }) {
  const { className, Icon } = STATUS_TONES[statusTone(status)];
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/** Best-effort clipboard write: modern API first, textarea fallback. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Copyable job-ID chip: shows half the UUID (or the full id in "full" mode)
 * and copies the whole id to the clipboard on click. Stops propagation so
 * clicking it does not also select the table row.
 */
export function JobIdChip({
  id,
  variant = "half",
  className = "",
}: {
  id: string;
  variant?: "half" | "full";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const label =
    variant === "full" || id.length <= 24
      ? id
      : id.slice(0, Math.ceil(id.length / 2)) + "...";

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (await copyText(id)) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${id}`}
      className={`group inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-muted/60 px-2 py-1 font-mono text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/10 ${className}`}
    >
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
      )}
      <span className="truncate">{copied ? "Copied!" : label}</span>
    </button>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/**
 * Read-only detail panel for the job selected in the table.
 *
 * Purely presentational: the list endpoint already carries every field shown
 * here, so selecting a job costs the client no extra server request.
 */
export default function JobDetails({ job }: { job: ExportJob }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">Job details</CardTitle>
          <StatusPill status={job.status} />
        </div>
        <JobIdChip id={job.id} variant="full" />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Exported items</p>
          <p className="text-xl font-semibold tabular-nums text-primary">
            {job.exported_count.toLocaleString()}
          </p>
        </div>

        <DetailRow label="Coupon">
          {job.coupon_code ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <TagIcon className="h-3.5 w-3.5" />
              {job.coupon_code} ({Number(job.coupon_percent ?? 0)}% off)
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No coupon used</span>
          )}
        </DetailRow>

        {job.razorpay_payment_id && (
          <DetailRow label="Payment ID">
            <span className="break-all font-mono text-xs text-foreground/80">
              {job.razorpay_payment_id}
            </span>
          </DetailRow>
        )}

        <DetailRow label="Created">
          <span className="text-sm text-foreground/80">
            {new Date(job.created_at).toLocaleString()}
          </span>
        </DetailRow>
      </CardContent>
    </Card>
  );
}
