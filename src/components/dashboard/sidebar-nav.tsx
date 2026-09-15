"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink } from "@mantine/core";
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
    <>
      {items.map((item) => {
        const actif =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            active={actif}
            onClick={onNavigate}
          />
        );
      })}
    </>
  );
}
