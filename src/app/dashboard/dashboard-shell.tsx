"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardNavigation, NavItems, SelectProject } from "@/components";
import { useProjectContext } from "@/context";
import { ArrowRightLeft, SidebarOpen, SidebarClose } from "lucide-react";
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();
  const toggleProfileMenu = () => setShowProfileMenu((prev) => !prev);

  // Close menu when click outside - could be added later

  const navItems: NavItems[] = [
    {
      icon: <ArrowRightLeft size={ICON_SIZE} />,
      link: activeProject ? `/dashboard/${activeProject}` : "/dashboard",
      title: "Shopify To WordPress",
    },
    {
      icon: <ArrowRightLeft size={ICON_SIZE} />,
      link: activeProject
        ? `/dashboard/${activeProject}/wp-to-shopify`
        : "/dashboard/wp-to-shopify",
      title: "WordPress To Shopify",
    },
    {
      icon: <ArrowRightLeft size={ICON_SIZE} />,
      link: activeProject
        ? `/dashboard/${activeProject}/wp-to-wp`
        : "/dashboard/wp-to-wp",
      title: "WordPress To WordPress",
    },
  ];

  useEffect(() => {
    if (projects.length === 0) return;
    setAllProjects(projects);
  }, [projects, setAllProjects]);

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
          <div className="flex items-center gap-2">
            {drawerClosed ? (
              <SidebarOpen
                size={28}
                className="cursor-pointe text-primary/60 rounded-full p-1.5 hover:bg-primary/10"
                onClick={() => setDrawerClosed((prev) => !prev)}
              />
            ) : (
              <SidebarClose
                size={28}
                className="cursor-pointer text-primary/60 rounded-full p-1.5 hover:bg-primary/10"
                onClick={() => setDrawerClosed((prev) => !prev)}
              />
            )}
            {/* Breadcrumb */}
            <nav className="text-sm text-primary/60 hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              {activeProject && (
                <>
                  <span>/</span>
                  <Link
                    href={`/dashboard/${activeProject}`}
                    className="hover:underline"
                  >
                    {activeProject}
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right side: add button, profile icon, user name */}
          <div className="flex items-center gap-4">
            {/* Add new project button */}
            <button
              onClick={() => {
                router.push("/dashboard/new-project");
              }}
              className="px-2 py-1 text-xs border hover:bg-primary/10 border-primary/20 rounded-sm"
            >
              + Add a new project
            </button>
            {/* Profile icon with dropdown */}
            <div className="relative" onClick={toggleProfileMenu}>
              <div className="flex items-center gap-1 cursor-pointer">
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/20 text-primary font-medium uppercase">
                  {user.name?.charAt(0)}
                </div>
              </div>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg border border-primary/10 rounded-md py-1 z-20">
                  <Link
                    href={
                      activeProject
                        ? `/dashboard/${activeProject}/export-jobs`
                        : "/dashboard/export-jobs"
                    }
                    className="block px-4 py-2 text-sm text-primary/80 hover:bg-primary/10"
                  >
                    Export Jobs
                  </Link>
                  <Link
                    href={
                      activeProject
                        ? `/dashboard/${activeProject}/import-settings`
                        : "/dashboard/import-settings"
                    }
                    className="block px-4 py-2 text-sm text-primary/80 hover:bg-primary/10"
                  >
                    Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
