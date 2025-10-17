// app/routes/webhooks.checkouts.update.tsx

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  
  if (!shop) {
    return new Response();
  }

  console.log(`--- Webhook ${topic} reçu pour la boutique ${shop} ---`);

  const { id: checkoutId, line_items, total_price, customer, shipping_address, phone, abandoned_checkout_url, token } = payload;

  // AJOUTEZ CETTE LIGNE DE DÉBOGAGE
  console.log(`[DEBUG UPDATE] Checkout ${checkoutId}, URL: ${abandoned_checkout_url}`);

  const customerPhone = customer?.phone || shipping_address?.phone || phone;
  const customerName = `${customer?.first_name || shipping_address?.first_name || ''} ${customer?.last_name || shipping_address?.last_name || ''}`.trim();

  if (!customerPhone) {
    console.log(`Mise à jour du checkout ${checkoutId} SANS numéro de téléphone trouvé. On ignore.`);
    return new Response();
  }

  console.log(`Mise à jour du checkout ${checkoutId} AVEC le numéro : ${customerPhone}`);

  try {
    await db.abandonedCheckout.upsert({
      where: { checkoutId: checkoutId.toString() },
      update: {
        customerName,
        customerPhone,
        abandonedCheckoutUrl: abandoned_checkout_url,
        cartTotal: parseFloat(total_price),
        lineItems: line_items,
        checkoutToken: token,
      },
      create: {
        checkoutId: checkoutId.toString(),
        shop,
        customerName,
        customerPhone,
        abandonedCheckoutUrl: abandoned_checkout_url,
        cartTotal: parseFloat(total_price),
        lineItems: line_items,
        checkoutToken: token,
      },
    });
    console.log("Panier abandonné mis à jour/créé avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'upsert du panier abandonné :", error);
  }

  return new Response();
};