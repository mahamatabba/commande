"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

export function SidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const actif =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-[2px] border-l-2 px-2.5 py-2.25 text-sm font-medium transition-colors",
              actif
                ? "border-l-[#8FB2DD] bg-[#22405F] text-white"
                : "border-l-transparent text-[#A9BBD1] hover:bg-[#1B3450] hover:text-[#E8EDF4]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
