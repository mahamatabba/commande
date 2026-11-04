import { auth, signOut } from "@/auth";
import { getNavSections } from "@/lib/nav";
import { compterElementsEnAttente } from "@/lib/nav-compteurs";
import { can } from "@/lib/permissions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const navSections = getNavSections(session);
  const compteurs = await compterElementsEnAttente(session);
  // Raccourcis « Nouveau » du menu, limités à ce que le rôle peut créer.
  const raccourcis = [
    can(session, "commandes_client:write") && { href: "/commandes-client/nouvelle", label: "Nouvelle vente" },
    can(session, "commandes_fournisseur:write") && {
      href: "/commandes-fournisseur/nouvelle",
      label: "Nouveau bon de commande",
    },
    can(session, "reglements:saisir") && { href: "/reglements", label: "Saisir un règlement" },
  ].filter((r): r is { href: string; label: string } => Boolean(r));

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/connexion" });
  }

  return (
    <DashboardShell
      navSections={navSections}
      compteurs={compteurs}
      raccourcis={raccourcis}
      userName={session?.user?.name}
      userRole={session?.user?.role}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}
