import { Check } from "lucide-react";

/** Small square checkbox used by the records table. */
export function TableCheckbox({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
        checked
          ? "border-blue-600 bg-blue-600"
          : "border-primary/25 bg-background hover:border-primary/50"
      }`}
    >
      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </button>
  );
}

