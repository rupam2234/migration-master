import { Loader2 } from "lucide-react";

export function GlobalLoader() {
  return (
    <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}
