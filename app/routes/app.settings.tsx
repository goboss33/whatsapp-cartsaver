import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Charge le paramètre actuel depuis la base de données
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await db.settings.findUnique({ where: { shop } });

  // Si aucun paramètre n'existe, on en crée un avec la valeur par défaut
  if (!settings) {
    settings = await db.settings.create({
      data: { shop: shop, delayMinutes: 60 },
    });
  }

  return { settings };
};

// Sauvegarde le nouveau paramètre dans la base de données
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const delayMinutes = parseInt(formData.get("delayMinutes") as string, 10);

  if (isNaN(delayMinutes) || delayMinutes < 1) {
    return { error: "Veuillez entrer un nombre valide supérieur à 0." };
  }

  await db.settings.update({
    where: { shop },
    data: { delayMinutes },
  });

  return { success: true };
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const isSaving = fetcher.state === "submitting";

  return (
    <s-page heading="Paramètres">
      {fetcher.data?.success && <s-banner status="success">Paramètres sauvegardés !</s-banner>}
      {fetcher.data?.error && <s-banner status="critical">{fetcher.data.error}</s-banner>}
      <s-section heading="Automatisation des relances">
        <fetcher.Form method="post">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="delayMinutes"
              label="Délai avant l'envoi du message de relance"
              helpText="Le temps en minutes après lequel un panier est considéré comme abandonné."
              type="number"
              defaultValue={settings.delayMinutes}
              required
            />
            <s-button type="submit" {...(isSaving ? { loading: true } : {})}>
              Sauvegarder
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>
    </s-page>
  );
}