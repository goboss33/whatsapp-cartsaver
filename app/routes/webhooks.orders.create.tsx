import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (!shop) {
    return new Response();
  }

  console.log(`--- Webhook ${topic} reçu pour la boutique ${shop} ---`);

  // Ce token est la clé qui lie la commande au checkout d'origine
  const { checkout_token } = payload;

  if (!checkout_token) {
    console.log("Commande sans checkout_token, impossible de faire le suivi.");
    return new Response();
  }

  // On cherche un panier qui a été relancé ET qui a le bon token
  const abandonedCheckout = await db.abandonedCheckout.findUnique({
    where: {
      checkoutToken: checkout_token,
    },
  });

  // On vérifie aussi qu'il avait bien été relancé
  if (abandonedCheckout && abandonedCheckout.status === "relancé") {
    console.log(`🎉 Commande détectée pour un panier relancé ! Checkout Token: ${checkout_token}`);

    await db.abandonedCheckout.update({
      where: { id: abandonedCheckout.id },
      data: { status: "récupéré" },
    });

    console.log(`✅ Statut du panier ${abandonedCheckout.id} mis à jour en "récupéré".`);
  } else {
    console.log("Commande non issue d'une relance active, on l'ignore.");
  }

  return new Response();
};