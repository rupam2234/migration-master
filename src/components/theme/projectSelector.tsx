"use client";

import { useProjectContext } from "@/context";
import { ChevronsUpDownIcon } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SelectProjectProps {
  isCollapsed: boolean;
}

export function SelectProject({ isCollapsed }: SelectProjectProps) {
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

  useEffect(() => {
    if (activeProject !== null) return;

    const siteToSelect =
      allProjects && allProjects.find((x) => x === param.projects);

    siteToSelect && setActiveProject(siteToSelect);
  }, [allProjects, param, activeProject, setActiveProject]);

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
      className={`relative ${isCollapsed ? "w-full" : "w-[216px]"}`}
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
        className={`flex min-h-7 w-full items-center rounded-sm border-2 border-primary/20 bg-transparent px-2 py-1 text-xs font-semibold outline-none transition-opacity ${
          isCollapsed ? "justify-center" : "justify-between gap-2"
        } ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "text-primary/80 hover:border-primary/40"
        }`}
      >
        <ProjectLabel project={selectedItem} isCollapsed={isCollapsed} />

        <ChevronsUpDownIcon
          size={16}
          className="hidden shrink-0 text-primary md:block"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full min-w-[160px] rounded-sm border border-primary/10 bg-primary/80 py-0.5">
          {allProjects?.map((project) => (
            <button
              key={project}
              type="button"
              onClick={() => selectProject(project)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-primary-foreground/80 hover:bg-primary/5"
            >
              <span className="truncate">{project}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  function selectProject(title: string) {
    setActiveProject(title);
    setOpen(false);

    const currentProject = param.projects as string;

    const newPath = currentProject
      ? pathname.replace(
          `/dashboard/${encodeURIComponent(currentProject)}`,
          `/dashboard/${encodeURIComponent(title)}`,
        )
      : `/dashboard/${encodeURIComponent(title)}`;

    router.push(newPath);
  }
}

function ProjectLabel({
  project,
  isCollapsed,
}: {
  project?: string;
  isCollapsed: boolean;
}) {
  if (!project) {
    return isCollapsed ? (
      <span className="inline-block h-4 w-4" />
    ) : (
      <span className="truncate text-primary/50">Select a project</span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      {!isCollapsed && <span className="truncate">{project}</span>}
    </span>
  );
}
