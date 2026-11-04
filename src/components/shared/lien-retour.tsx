import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Lien « ← Liste » au-dessus d'une fiche ou d'un écran de saisie. */
export function LienRetour({ href, libelle }: { href: string; libelle: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--mantine-color-dimmed)] transition-colors hover:text-[var(--mantine-color-brand-4)]"
    >
      <ArrowLeft size={15} /> {libelle}
    </Link>
  );
}
