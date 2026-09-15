import {
  SqueletteEntete,
  SqueletteGraphique,
  SqueletteTuiles,
} from "@/components/shared/squelettes";

export default function Chargement() {
  return (
    <div className="space-y-6">
      <SqueletteEntete />
      <SqueletteTuiles nombre={4} />
      <SqueletteTuiles nombre={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SqueletteGraphique />
        <SqueletteGraphique />
      </div>
    </div>
  );
}
