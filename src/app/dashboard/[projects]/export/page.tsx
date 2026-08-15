"use client";

import { useProjectContext } from "@/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ExportDefault() {
  const router = useRouter();
  const { activeProject } = useProjectContext();

  useEffect(() => {
    if (activeProject) {
      router.replace(`/dashboard/${encodeURIComponent(activeProject)}/shopify-to-wp`);
    }
  }, [activeProject, router]);

  return null;
}
