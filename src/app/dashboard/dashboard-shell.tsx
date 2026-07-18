"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardFooter,
  DashboardNavigation,
  NavIcons,
  NavItems,
  SelectProject,
} from "@/components";
import { useProjectContext } from "@/context";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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
  const [drawerClosed, setDrawerClosed] = useState<boolean>(true);
  const { setAllProjects, activeProject } = useProjectContext();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();
  const toggleProfileMenu = () => setShowProfileMenu((prev) => !prev);
  const breadcrumbItems = usePathname().split("/").filter(Boolean).slice(0, 3);

  const navItems: NavItems[] = [
    {
      icon: <NavIcons size={15} imagePath="/images/shopify-logo.png" />,
      link: activeProject ? `/dashboard/${activeProject}` : "/dashboard",
      title: "Shopify To WordPress",
    },
    {
      icon: <NavIcons size={15} imagePath="/images/wordpress-logo.png" />,
      link: activeProject
        ? `/dashboard/${activeProject}/wp-to-shopify`
        : "/dashboard/wp-to-shopify",
      title: "WordPress To Shopify",
    },
    // {
    //   icon: <ArrowRightLeft size={ICON_SIZE} />,
    //   link: activeProject
    //     ? `/dashboard/${activeProject}/wp-to-wp`
    //     : "/dashboard/wp-to-wp",
    //   title: "WordPress To WordPress",
    // },
  ];

  const sidebarWidth = drawerClosed ? "w-16" : "w-16 md:w-72";

  useEffect(() => {
    if (projects.length === 0) return;
    setAllProjects(projects);
  }, [projects, setAllProjects]);

  return (
    <div className="flex h-screen">
      <div
        onMouseEnter={() => {
          if (window.innerWidth >= 768) {
            setDrawerClosed(false);
          }
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 768) {
            setDrawerClosed(true);
          }
        }}
        className={`${sidebarWidth} space-y-14 flex flex-col justify-between border-r border-primary/10 p-5 transition-all duration-200`}
      >
        <div className="flex flex-col gap-8">
          <SelectProject isCollapsed={drawerClosed} />
          <DashboardNavigation navItems={navItems} collapsed={drawerClosed} />
        </div>
        <DashboardFooter collapsed={drawerClosed} />
      </div>
      <div className="w-full overflow-y-auto">
        <div className="flex gap-4 h-16 w-full items-center justify-between border-b border-primary/10 px-3">
          <nav className="text-sm text-primary/60 flex items-center gap-1">
            <Link href="/dashboard" className="hover:underline hidden md:block">
              Dashboard
            </Link>

            {activeProject && (
              <>
                <span className="hidden md:block">/</span>

                {/* Mobile */}
                <Link
                  href={`/dashboard/${activeProject}`}
                  className="hover:underline"
                >
                  <span className="md:hidden">
                    {activeProject.split(".myshopify")[0]}
                  </span>

                  {/* Desktop */}
                  <span className="hidden md:inline">
                    {breadcrumbItems.slice(1).map((item, index) => (
                      <span key={item}>
                        {index > 0 && " / "}
                        {item.includes(".myshopify")
                          ? item
                          : item.replaceAll("-", " ")}
                      </span>
                    ))}
                  </span>
                </Link>
              </>
            )}
          </nav>

          {/* Right side: add button, profile icon, user name */}
          <div className="flex items-center gap-4">
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
