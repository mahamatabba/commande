import { Mail, Phone } from "lucide-react";
import { AEI_INFO } from "@/lib/constants";

/**
 * En-tête officielle AEI, calquée sur le papier à en-tête agréé HP réel :
 * logo HP à gauche, raison sociale centrée, logo AEI à droite, filet orange
 * de marque — utilisée sur tous les documents imprimables : factures et
 * bons de commande.
 */
export function DocumentHeader({
  label,
  numero,
  date,
}: {
  label: string;
  numero: string;
  date: string;
}) {
  return (
    <header className="mb-5 print:break-inside-avoid">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 px-10 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/hp-logo.png" alt="HP" width={64} height={42} className="shrink-0" />
        <div className="text-center">
          <p className="text-[15px] leading-tight font-bold tracking-tight text-[#00AEEF]">
            {AEI_INFO.nom}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[#1A1917]">{AEI_INFO.tagline}</p>
          <p className="mt-0.5 text-xs text-[#6B6862]">{AEI_INFO.adresse}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/aei-icon.png"
          alt="ABDELDJELIL ETUDE INFORMATIQUE"
          width={56}
          height={40}
          className="shrink-0 justify-self-end"
        />
      </div>
      <div className="h-[3px] bg-[#FAA755]" />
      <div className="flex items-end justify-between border-t border-[#E6E3DD] px-10 py-4">
        <div className="flex size-9 items-center justify-center rounded-[2px] bg-[#1E3A5F] text-[10px] font-semibold text-white">
          AEI
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-semibold text-[#1E3A5F]">{label}</h2>
          <p className="mt-1 font-mono text-sm tabular-nums">N° {numero}</p>
          <p className="font-mono text-xs tabular-nums text-[#6B6862]">Date : {date}</p>
        </div>
      </div>
    </header>
  );
}

/**
 * Pied de page officiel AEI — coordonnées et NIF, calqué sur le papier à
 * en-tête réel : fond blanc, filet bleu de marque, badge NIF orange en
 * bordure de page.
 */
export function DocumentFooter() {
  return (
    <footer className="mt-6 border-t-[3px] border-[#00AEEF] print:break-inside-avoid">
      <div className="flex flex-wrap items-stretch justify-between gap-4 px-8 py-3">
        <div className="flex flex-wrap items-center gap-6 py-1">
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 shrink-0 text-[#1A1917]" />
            <span className="font-mono text-xs font-semibold tabular-nums text-[#1A1917]">
              {AEI_INFO.telephones.join(" - ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-[#00AEEF]" />
            <div className="text-xs leading-tight font-semibold text-[#00AEEF]">
              {AEI_INFO.emails.map((email) => (
                <div key={email}>{email}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="-my-3 -mr-8 flex shrink-0 items-center bg-[#FAA755] px-5 text-xs font-bold text-white">
          <span className="font-mono tabular-nums">NIF : {AEI_INFO.nif}</span>
        </div>
      </div>
    </footer>
  );
}
