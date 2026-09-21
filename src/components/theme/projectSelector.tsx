"use client";

import { useProjectContext } from "@/context";
import {
  getDashboardChildPathFromPathname,
  getDashboardProjectPath,
  getSuitableProjects,
  isProjectSuitableForPath,
  WP_TO_SHOPIFY_PATH,
} from "@/lib/dashboard-routes";
import { Check, ChevronsUpDownIcon, Plus } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SelectProject() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { allProjects, activeProject, setActiveProject } = useProjectContext();
  const router = useRouter();
  const param = useParams();
  const pathname = usePathname();

  const disabled = pathname.includes("/export/");

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const selectedItem =
    allProjects && allProjects.find((project) => project === activeProject);

  // Only offer projects that suit the migration path currently being viewed
  // (e.g. Shopify stores for "Shopify to WordPress", WordPress sites for
  // "WordPress to Shopify").
  const childPath = getDashboardChildPathFromPathname(pathname);
  const suitableProjects = getSuitableProjects(allProjects, childPath);

  // If the URL points at a project that is not suitable for the current
  // migration path, redirect to the first suitable project instead of
  // showing the "not suitable" warning (and without fighting the
  // route-param sync effect over context state).
  useEffect(() => {
    if (!childPath || suitableProjects.length === 0) return;

    const routeProject =
      typeof param.projects === "string"
        ? decodeURIComponent(param.projects)
        : null;

    const routeProjectIsSuitable =
      routeProject && isProjectSuitableForPath(routeProject, childPath);

    if (routeProject && routeProjectIsSuitable) return;

    // No route project (or an unsuitable one) while on a migration path:
    // only redirect when the active project is also unsuitable, so we don't
    // interrupt a deliberate in-progress selection.
    if (isProjectSuitableForPath(activeProject, childPath)) return;

    const firstSuitable = suitableProjects[0];
    router.replace(getDashboardProjectPath(firstSuitable, childPath));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childPath, param.projects, activeProject, allProjects]);

  useEffect(() => {
    const siteToSelect =
      allProjects && allProjects.find((x) => x === param.projects);

    if (siteToSelect && siteToSelect !== activeProject) {
      setActiveProject(siteToSelect);
    }
  }, [allProjects, param.projects, activeProject, setActiveProject]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        title={
          disabled
            ? "Project selection is disabled while exporting."
            : (selectedItem ?? "Select a project")
        }
        className={`flex max-w-[260px] items-center gap-1.5 rounded-sm border-2 border-transparent bg-primary/5 px-2 py-1 text-sm font-semibold outline-none transition-colors ${
          disabled
            ? "cursor-not-allowed text-primary/40"
            : "text-primary/80 hover:border-primary/30 hover:bg-primary/10"
        } ${open && !disabled ? "border-primary/30 bg-primary/10" : ""}`}
      >
        <ProjectLabel project={selectedItem} />

        <ChevronsUpDownIcon
          size={16}
          className="shrink-0 text-primary/60"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 min-w-max rounded-sm border border-primary/20 bg-white py-1 text-primary shadow-lg">
          {suitableProjects.length > 0 ? (
            suitableProjects.map((project) => (
              <button
                key={project}
                type="button"
                onClick={() => selectProject(project)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-primary/5 ${
                  project === activeProject
                    ? "font-normal text-primary"
                    : "font-medium text-primary/70"
                }`}
              >
                <Check
                  size={14}
                  className={`shrink-0 ${
                    project === activeProject ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="truncate">{project}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-primary/50">
              No projects available for this migration path
            </p>
          )}

          <div className="my-1 border-t border-primary/10" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/dashboard/new-project");
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-primary/70 hover:bg-primary/5"
          >
            <Plus size={14} className="shrink-0" />
            <span>Add a new project</span>
          </button>
        </div>
      )}
    </div>
  );

  function selectProject(title: string) {
    setActiveProject(title);
    setOpen(false);

    // Switching projects starts a fresh session, but keeps the migration
    // path currently being viewed (e.g. staying on "wp-to-shopify").
    const nextPath =
      childPath === WP_TO_SHOPIFY_PATH
        ? getDashboardProjectPath(title, WP_TO_SHOPIFY_PATH)
        : getDashboardProjectPath(title);

    router.push(nextPath);
  }
}

function ProjectLabel({ project }: { project?: string }) {
  if (!project) {
    return <span className="truncate text-primary/50">Select a project</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2 overflow-hidden">
      <span className="truncate">{project.split(".myshopify")[0]}</span>
    </span>
  );
}
