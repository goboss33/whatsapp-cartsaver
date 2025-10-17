// app/routes/webhooks.checkouts.create.tsx

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (!shop) {
    return new Response();
  }

  console.log(`--- Webhook ${topic} reçu pour la boutique ${shop} ---`);

  // On récupère le "token" du payload, qui est le checkout_token
  const { id: checkoutId, line_items, total_price, customer, abandoned_checkout_url, token } = payload;

  // AJOUTEZ CETTE LIGNE DE DÉBOGAGE
  console.log(`[DEBUG CREATE] Checkout ${checkoutId}, URL: ${abandoned_checkout_url}`);

  try {
    await db.abandonedCheckout.create({
      data: {
        checkoutId: checkoutId.toString(),
        checkoutToken: token,
        shop: shop,
        customerName: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(),
        customerPhone: customer?.phone,
        abandonedCheckoutUrl: abandoned_checkout_url,
        cartTotal: parseFloat(total_price),
        lineItems: line_items,
      },
    });
    console.log("Entrée initiale de panier abandonné créée.");
  } catch (error) {
    console.log("L'entrée de checkout existe probablement déjà. On ignore.");
  }

  return new Response();
};