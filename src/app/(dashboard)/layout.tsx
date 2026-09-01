import { auth, signOut } from "@/auth";
import { getNavItems } from "@/lib/nav";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const navItems = getNavItems(session);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <MobileNav items={navItems} />
          <span className="font-semibold">AEI — Gestion commerciale</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          <span className="hidden sm:inline">
            {session?.user?.name} · {session?.user?.role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/connexion" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 overflow-y-auto border-r bg-white p-4 md:block">
          <SidebarNav items={navItems} />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
