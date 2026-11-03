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
        description="Cachet signé imprimé sur les factures, proformas et bons."
      />

      <Alert color="brand" variant="light">
        Le cachet importé — qui porte déjà la signature du responsable — apparaît dans la zone
        «&nbsp;Pour ABDELDJELIL ETUDE INFORMATIQUE — Signature et cachet&nbsp;» de toutes les
        factures, proformas et bons. Pour un rendu net, utilisez un PNG à fond transparent, recadré
        au plus près du cachet.
      </Alert>

      <SimpleGrid cols={1} maw={560}>
        <VisuelSignatureCard
          cle="cachet"
          titre="Cachet signé"
          description="Cachet de l'entreprise avec la signature, scanné ou photographié."
          imageActuelle={visuels.cachet}
        />
      </SimpleGrid>
    </Stack>
  );
}
