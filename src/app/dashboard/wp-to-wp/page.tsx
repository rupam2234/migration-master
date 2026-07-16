import { Hammer } from "lucide-react";

export default function UnderConstruction() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-primary/60">
      <Hammer size={48} className="mb-4 text-primary/40" />
      <h2 className="text-xl font-semibold mb-2 text-primary/80">Under Construction</h2>
      <p className="text-sm text-center max-w-md">
        This migration path is currently being built. Check back later for updates!
      </p>
    </div>
  );
}
