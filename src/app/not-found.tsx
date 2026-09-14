import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageIntrouvable() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-[2px] border border-border bg-card p-8">
        <div className="inline-flex rounded-[2px] border border-[#C6D2E0] bg-[#EEF2F7] p-2 text-[#1E3A5F]">
          <FileQuestion className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le document demandé n&apos;existe pas, ou il a été supprimé. Vérifiez le
          numéro, ou repartez d&apos;un écran de liste.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button render={<Link href="/dashboard" />}>Tableau de bord</Button>
          <Button variant="outline" render={<Link href="/factures" />}>
            Liste des factures
          </Button>
        </div>
      </div>
    </div>
  );
}
