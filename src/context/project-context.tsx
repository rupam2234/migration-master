"use client";

import { ResourceKey, WordPressResource, WXRConfig } from "@/lib";
import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";

interface ProjectContextValue {
  activeProject: string | null;
  setActiveProject: (project: string | null) => void;
  allProjects: string[];
  setAllProjects: (string: string[]) => void;
  shopifyData: Record<ResourceKey, unknown>;
  setShopifyData: React.Dispatch<
    React.SetStateAction<Record<ResourceKey, unknown>>
  >;
  wordPressData: Record<WordPressResource, any[]>;
  setWordPressData: React.Dispatch<
    React.SetStateAction<Record<WordPressResource, any[]>>
  >;
  wpImportSettings: WXRConfig;
  setWpImportntSettings: React.Dispatch<React.SetStateAction<WXRConfig>>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(
  undefined,
);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<string[]>([]);
  const [shopifyData, setShopifyData] = useState<Record<string, unknown>>({});
  const [wordPressData, setWordPressData] = useState<
    Record<WordPressResource, any[]>
  >({
    posts: [],
    categories: [],
    coupons: [],
    customers: [],
    media: [],
    orders: [],
    pages: [],
    products: [],
  });
  const [wpImportSettings, setWpImportntSettings] = useState<WXRConfig>({
    siteUrl: "",
    defaultAuthor: "admin",
    wxrVersion: "1.2",
  });

  useEffect(() => {
    setShopifyData({});
  }, [activeProject]);

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        setActiveProject,
        allProjects,
        setAllProjects,
        shopifyData,
        setShopifyData,
        wordPressData,
        setWordPressData,
        setWpImportntSettings,
        wpImportSettings,
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
