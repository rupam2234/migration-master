import type { LucideIcon } from "lucide-react";

/** Centered placeholder card used for every "nothing to show yet" state. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-sm border border-primary/10 bg-background p-10 text-center shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/10 bg-primary/5">
        <Icon size={20} className="text-primary/40" />
      </div>

      <p className="text-sm font-semibold text-primary/80">{title}</p>

      <p className="mt-1 max-w-sm text-xs leading-relaxed text-primary/45">
        {description}
      </p>
    </div>
  );
}
