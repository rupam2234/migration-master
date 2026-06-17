"use client";

import { DashboardNavigation, NavItems, SelectProject } from "@/components";
import { useProjectContext } from "@/context";
import {
  MenuIcon,
  SidebarClose,
  ArrowRightLeft,
  SidebarOpen,
  Settings,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

const ICON_SIZE = 16;

export interface DashboardShellProps {
  children: ReactNode;
  user: { id: string; name: string; email: string };
  projects: string[];
}

export function DashboardShell({
  children,
  user,
  projects,
}: DashboardShellProps) {
  const [drawerClosed, setDrawerClosed] = useState<boolean>(false);
  const { setAllProjects, activeProject } = useProjectContext();

  const navItems: NavItems[] = [
    {
      icon: <ArrowRightLeft size={ICON_SIZE} />,
      link: activeProject ? `/dashboard/${activeProject}` : "#",
      title: "Export Data",
    },
    {
      icon: <Settings size={ICON_SIZE} />,
      link: activeProject ? `/dashboard/${activeProject}/#` : "#",
      title: "Settings",
    },
  ];

  useEffect(() => {
    if (projects.length === 0) return;

    setAllProjects(projects);
  }, [projects]);

  return (
    <div className="flex h-screen">
      <div
        className={`${drawerClosed ? "md:w-16" : "md:w-72 w-16"} space-y-14 border-r border-primary/10 p-5`}
      >
        <SelectProject isCollapsed={drawerClosed} />
        <DashboardNavigation navItems={navItems} collapsed={drawerClosed} />
      </div>
      <div className="w-full overflow-y-auto">
        <div className="flex h-16 w-full items-center justify-between border-b border-primary/10 px-3">
          <div className="hidden text-primary/60 md:block">
            {drawerClosed ? (
              <SidebarOpen
                size={28}
                className="cursor-pointer rounded-full p-1.5 hover:bg-primary/10"
                onClick={() => setDrawerClosed((prev) => !prev)}
              />
            ) : (
              <SidebarClose
                size={28}
                className="cursor-pointer rounded-full p-1.5 hover:bg-primary/10"
                onClick={() => setDrawerClosed((prev) => !prev)}
              />
            )}
          </div>
          <div className="block pl-2 text-primary/60 md:hidden">
            <MenuIcon />
          </div>
          <span className="text-sm text-primary/60">{user.name}</span>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
