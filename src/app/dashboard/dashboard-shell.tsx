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
import { CreditWallet } from "@/components/credits/credit-wallet";
import { CreditPurchaseModal } from "@/app/dashboard/[projects]/export/[resources]/credit-purchase-modal";
import {
  getDashboardProjectPath,
  SHOPIFY_TO_WP_PATH,
} from "@/lib/dashboard-routes";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Coins, Plus } from "lucide-react";
import { usePathname, useParams } from "next/navigation";

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
  const { setAllProjects, activeProject, setActiveProject } = useProjectContext();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projects?: string }>();
  const routeProject =
    typeof params.projects === "string"
      ? decodeURIComponent(params.projects)
      : activeProject;
  const pathAfterProject = pathname.split("/").filter(Boolean).slice(3); // /dashboard/{project}/... -> segments after the project

  const profileMenuRef = useRef<HTMLDivElement>(null);

  const navItems: NavItems[] = [
    {
      icon: <NavIcons size={15} imagePath="/images/shopify-logo.png" />,
      link: routeProject
        ? getDashboardProjectPath(routeProject, SHOPIFY_TO_WP_PATH)
        : "/dashboard",
      title: "Shopify To WordPress",
    },
    {
      icon: <NavIcons size={15} imagePath="/images/wordpress-logo.png" />,
      link: routeProject
        ? `/dashboard/${encodeURIComponent(routeProject)}/wp-to-shopify`
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

  const profileNav: { title: string; link?: string; onClick?: () => void }[] = [
    {
      title: "Export Jobs",
      link: routeProject
        ? `/dashboard/${encodeURIComponent(routeProject)}/export-jobs`
        : "/dashboard/export-jobs",
    },
    {
      title: "Settings",
      link: routeProject
        ? `/dashboard/${encodeURIComponent(routeProject)}/settings`
        : "/dashboard/settings",
    },
    {
      title: "Log out",
      onClick: async () => {
        const res = await fetch("/api/db/user/sign-out", {
          method: "POST",
        });

        if (!res.ok) {
          const errorRes: any = await res.json();
          console.error(errorRes.message);
        }

        if (res.ok) {
          router.replace("/auth/sign-in");
          router.refresh();
        }
      },
    },
  ];

  const toggleProfileMenu = () => {
    return setShowProfileMenu((prev) => !prev);
  };

  const refreshCreditBalance = async () => {
    const response = await fetch("/api/credits/balance", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load credits");
    const data = await response.json();
    if (data?.success && Number.isFinite(Number(data.balance))) {
      setCreditBalance(Number(data.balance));
    }
  };

  useEffect(() => {
    let cancelled = false;
    refreshCreditBalance()
      .catch(() => {
        if (!cancelled) setCreditBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    setAllProjects(projects);
  }, [projects, setAllProjects]);

  useEffect(() => {
    // Set active project from URL if not already set
    if (routeProject && routeProject !== activeProject) {
      setActiveProject(routeProject);
    }
  }, [routeProject]);

  useEffect(() => {
    const handleClickOutsideProfileMenu = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideProfileMenu);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideProfileMenu);
    };
  }, []);

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
          <DashboardNavigation navItems={navItems} collapsed={drawerClosed} />
        </div>
        <DashboardFooter collapsed={drawerClosed} />
      </div>
      <div className="w-full overflow-y-auto">
        <div className="flex h-16 w-full items-center justify-between gap-4 border-b border-primary/10 px-3">
          <nav className="flex min-w-0 items-center gap-1 text-sm text-primary/60">
            <SelectProject />

            {routeProject ? (
              <>
                {pathAfterProject.map((segment, index) => (
                  <span
                    key={segment}
                    className="flex min-w-0 items-center gap-1"
                  >
                    <span className="text-primary/30">/</span>
                    <span className="truncate lowercase">
                      {segment.replaceAll("-", " ")}
                    </span>
                    {index === pathAfterProject.length - 1 && (
                      <Link
                        href="/dashboard"
                        className="ml-2 shrink-0 text-xs hover:underline"
                      >
                        All projects
                      </Link>
                    )}
                  </span>
                ))}
              </>
            ) : (
              <span className="truncate">Dashboard</span>
            )}
          </nav>

          {/* Right side: add button, profile icon, user name */}
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="hidden sm:block">
               <CreditWallet balance={creditBalance} onPurchase={() => setShowCreditPurchase(true)} />
             </div>
            {/* Profile icon with dropdown */}
            <div
              className="relative"
              onClick={toggleProfileMenu}
              ref={profileMenuRef}
            >
              <div className="flex items-center gap-1 cursor-pointer">
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/20 text-primary font-medium uppercase">
                  {user.name?.charAt(0)}
                </div>
              </div>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-primary/10 bg-card p-1.5 shadow-xl z-20">
                  <div className="border-b border-primary/10 px-2.5 pb-2 pt-1.5 sm:hidden">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-primary/55">
                        <Coins className="h-3.5 w-3.5" /> Credits available
                      </span>
                      <span className="font-semibold tabular-nums text-primary/90">
                        {creditBalance === null ? "Loading…" : creditBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowCreditPurchase(true);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-xs font-medium text-primary-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" /> Buy credits
                      </button>
                    </div>
                  </div>
                  {profileNav &&
                    profileNav.map((item) => {
                      return (
                        <Link
                          key={item.title}
                          href={item.link !== undefined ? item.link : ""}
                          className="block px-4 py-2 text-sm text-primary/80 hover:bg-primary/10"
                          onClick={item.onClick}
                        >
                          {item.title}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <CreditPurchaseModal
        open={showCreditPurchase}
        onOpenChange={setShowCreditPurchase}
        requiredCredits={1}
        purchaseMode="wallet"
        onPaymentSuccess={async () => {
          await refreshCreditBalance();
        }}
      />
    </div>
  );
}
