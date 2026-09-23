import Link from "next/link";
import { Loader2Icon, ArrowRightIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceEstimate } from "@/lib/estimate-utils";

interface AssetCardProps<TType extends string = string> {
  type: TType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  count: number | null;
  isLoading: boolean;
  onFetch: (type: TType, blogId?: string) => void;
  /** True when this resource needs a scope value (e.g. blog id) before fetching. */
  scoped?: boolean;
  blogIdValue?: string;
  onBlogIdChange?: (value: string) => void;
  /** Destination for the Export link; rendered only when data is loaded. */
  exportHref?: string;
  /**
   * Free-estimation data for this resource. A snapshot always carries a
   * terminal state, so this renders either a number or an honest reason —
   * never an endless "estimating…".
   */
  estimate?: (ResourceEstimate & { isFree: boolean }) | null;
  /** True while the shared estimate request is still in flight. */
  estimateLoading?: boolean;
}

export function AssetCard<TType extends string = string>({
  type,
  label,
  description,
  icon: Icon,
  accent,
  count,
  isLoading,
  onFetch,
  scoped = false,
  blogIdValue,
  onBlogIdChange,
  exportHref,
  estimate = null,
  estimateLoading = false,
}: AssetCardProps<TType>) {
  const hasData = !isLoading && count !== null && count > 0;

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-sm ${accent}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          {isLoading && (
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="space-y-1">
          <CardTitle className="text-base">{label}</CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </CardHeader>

      {scoped && (
        <CardContent className="pb-4">
          <input
            type="text"
            value={blogIdValue || ""}
            onChange={(e) => onBlogIdChange?.(e.target.value)}
            placeholder="Blog ID"
            className="w-full rounded-sm border border-input bg-muted px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-primary focus:bg-background"
            disabled={isLoading}
          />
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between pt-2">
        <div className="flex flex-col gap-0.5">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          ) : count !== null ? (
            <span className="text-xs font-medium text-foreground/80">
              {count} item{count === 1 ? "" : "s"} loaded
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No data yet</span>
          )}

          {estimateLoading && !estimate ? (
            <Skeleton className="h-3 w-20 rounded" />
          ) : estimate ? (
            <span className="text-[11px] text-muted-foreground">
              {/* {estimate.count !== null && (
                <>
                  ~{estimate.count.toLocaleString()} in store{" · "}
                </>
              )} */}
              {estimate.isFree ? (
                <span className="font-medium text-emerald-600">Free</span>
              ) : estimate.credits !== null ? (
                <span
                  className="font-medium text-foreground/70"
                  title={estimate.reason ?? undefined}
                >
                  {estimate.exact ? "~" : "≥"}
                  {estimate.credits.toLocaleString()} credits required
                </span>
              ) : estimate.state === "DEFERRED" ? (
                <span
                  className="text-muted-foreground/70"
                  title={estimate.reason ?? undefined}
                >
                  Counted at export
                </span>
              ) : (
                <span
                  className="text-amber-600/90"
                  title={estimate.reason ?? undefined}
                >
                  Estimate unavailable
                </span>
              )}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {hasData && exportHref && (
            <Link
              href={exportHref}
              className="inline-flex h-8 items-center rounded-md bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Export
            </Link>
          )}

          <Button
            onClick={() => onFetch(type, scoped ? blogIdValue : undefined)}
            variant="outline"
            size="sm"
            loading={isLoading}
            disabled={isLoading || (scoped && !blogIdValue?.trim())}
            className="h-8 px-3 text-xs"
          >
            {isLoading ? (
              "Loading..."
            ) : (
              <>
                Fetch
                <ArrowRightIcon className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
