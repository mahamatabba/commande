"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import type { NavItem } from "@/lib/nav";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <Sheet open={ouvert} onOpenChange={setOuvert}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="w-64 border-sidebar-border bg-sidebar p-4"
      >
        <SheetHeader className="p-0 pb-2">
          <SheetTitle className="text-sidebar-foreground">
            AEI — Gestion commerciale
          </SheetTitle>
        </SheetHeader>
        <SidebarNav items={items} onNavigate={() => setOuvert(false)} />
      </SheetContent>
    </Sheet>
  );
}
