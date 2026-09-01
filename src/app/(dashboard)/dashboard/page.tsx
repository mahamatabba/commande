import { auth } from "@/auth";
import { PERMISSIONS, hasPermission, type Permission } from "@/lib/permissions";

export default async function PageTableauDeBord() {
  const session = await auth();
  const role = session!.user.role;

  const permissionsAccordees = PERMISSIONS.filter((p: Permission) =>
    hasPermission(role, p),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <p className="text-zinc-600">
        Connecté en tant que <strong>{session!.user.name}</strong> — rôle{" "}
        <strong>{role}</strong>.
      </p>
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-medium">
          Permissions accordées (vérification de la matrice)
        </h2>
        <ul className="grid grid-cols-1 gap-1 text-sm text-zinc-700 sm:grid-cols-2">
          {permissionsAccordees.map((p) => (
            <li key={p} className="rounded bg-zinc-100 px-2 py-1">
              {p}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-zinc-400">
        Écran temporaire — le contenu définitif par rôle sera construit après
        validation du schéma, de la matrice de permissions et de
        l&apos;authentification.
      </p>
    </div>
  );
}
