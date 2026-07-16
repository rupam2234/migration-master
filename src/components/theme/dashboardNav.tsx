import { PiIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export type NavItems = {
  title: string;
  link?: string;
  icon?: ReactNode;
  active?: boolean;
};

export function DashboardNavigation({
  collapsed,
  navItems,
}: {
  collapsed: boolean;
  navItems: NavItems[];
}) {
  return (
    <div>
      {navItems &&
        navItems.map((item) => {
          return (
            <Link
              href={item.link ?? "#"}
              key={item.title}
              className={`flex ${item.active && "bg-primary/5"} text-sm hover:bg-primary/10 px-2 rounded-sm font-medium ${collapsed && "justify-center"} items-center gap-2 text-primary/80 py-1 hover:text-primary/60 my-2`}
            >
              <span>{item?.icon ?? <PiIcon size={16} />}</span>
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
    </div>
  );
}
