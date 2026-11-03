import { auth, signOut } from "@/auth";
import { getNavSections } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const navSections = getNavSections(session);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/connexion" });
  }

  return (
    <DashboardShell
      navSections={navSections}
      userName={session?.user?.name}
      userRole={session?.user?.role}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}
