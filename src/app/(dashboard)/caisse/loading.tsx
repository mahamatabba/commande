import {
  SqueletteEntete,
  SqueletteFiltres,
  SqueletteTableau,
  SqueletteTuiles,
} from "@/components/shared/squelettes";

export default function Chargement() {
  return (
    <div className="space-y-6">
      <SqueletteEntete />
      <SqueletteTuiles nombre={3} />
      <SqueletteFiltres champs={2} />
      <SqueletteTableau colonnes={6} lignes={10} />
    </div>
  );
}
