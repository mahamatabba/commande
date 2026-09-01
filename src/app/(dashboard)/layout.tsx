import { auth, signOut } from "@/auth";
import { getNavItems } from "@/lib/nav";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const navItems = getNavItems(session);

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[236px_1fr]">
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar px-3.5 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[2px] bg-[#E8EDF4] text-[13px] font-semibold text-sidebar">
            AEI
          </div>
          <span className="text-sm leading-tight font-medium text-sidebar-foreground">
            AEI — Gestion commerciale
          </span>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto">
          <SidebarNav items={navItems} />
        </nav>

        <div className="mt-auto border-t border-sidebar-border pt-3.5">
          <p className="px-2.5 text-[10px] font-semibold tracking-wider text-[#7E93AE] uppercase">
            Session
          </p>
          <p className="mt-2 px-2.5 text-[13px] font-semibold text-sidebar-foreground">
            {session?.user?.name}
          </p>
          <p className="px-2.5 text-xs text-[#7E93AE]">{session?.user?.role}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/connexion" });
            }}
          >
            <button
              type="submit"
              className="mt-2.5 px-2.5 text-[13px] text-[#A9BBD1] transition-colors hover:text-sidebar-foreground hover:underline"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <MobileNav items={navItems} />
            <span className="text-sm font-semibold text-primary">AEI</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {session?.user?.name}
          </span>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
