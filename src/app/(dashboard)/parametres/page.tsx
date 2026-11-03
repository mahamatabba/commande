import { Settings } from "lucide-react";
import { Alert, SimpleGrid, Stack } from "@mantine/core";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { lireVisuelsSignature } from "@/lib/parametres";
import { EnTetePage } from "@/components/shared/en-tete-page";
import { VisuelSignatureCard } from "@/components/parametres/visuel-signature-card";

export default async function PageParametres() {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");

  const visuels = await lireVisuelsSignature();

  return (
    <Stack gap="lg">
      <EnTetePage
        icone={Settings}
        couleur="gray"
        titre="Paramètres"
        description="Signature et cachet imprimés sur les factures, proformas et bons."
      />

      <Alert color="brand" variant="light">
        Les images importées apparaissent dans la zone « Pour ABDELDJELIL ETUDE INFORMATIQUE —
        Signature et cachet » de tous les documents PDF. Pour un rendu net, utilisez un PNG à fond
        transparent (scan recadré au plus près de la signature).
      </Alert>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <VisuelSignatureCard
          cle="signature"
          titre="Signature"
          description="Signature manuscrite du responsable, scannée ou photographiée."
          imageActuelle={visuels.signature}
        />
        <VisuelSignatureCard
          cle="cachet"
          titre="Cachet"
          description="Cachet de l'entreprise, superposé à côté de la signature."
          imageActuelle={visuels.cachet}
        />
      </SimpleGrid>
    </Stack>
  );
}
