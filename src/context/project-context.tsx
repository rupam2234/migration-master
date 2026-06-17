"use client";

import { ResourceKey } from "@/app";
import { createContext, ReactNode, useContext, useState } from "react";

interface ProjectContextValue {
  activeProject: string | null;
  setActiveProject: (project: string | null) => void;
  allProjects: string[];
  setAllProjects: (string: string[]) => void;
  shopifyData: Record<ResourceKey, unknown>;
  setShopifyData: React.Dispatch<
    React.SetStateAction<Record<ResourceKey, unknown>>
  >;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(
  undefined,
);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<string[]>([]);
  const [shopifyData, setShopifyData] = useState<Record<string, unknown>>({});

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        setActiveProject,
        allProjects,
        setAllProjects,
        shopifyData,
        setShopifyData,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
