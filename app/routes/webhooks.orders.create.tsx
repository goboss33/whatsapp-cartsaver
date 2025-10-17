// app/routes/webhooks.orders.create.tsx

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// 1. REQUÊTE POUR TROUVER LA LIGNE D'ABONNEMENT DÉDIÉE À L'USAGE
const GET_USAGE_SUBSCRIPTION_LINE_ITEM = `
  query GetActiveUsageSubscription {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        lineItems {
          id
          plan {
            pricingDetails {
              __typename
            }
          }
        }
      }
    }
  }
`;

// 2. REQUÊTE DE FACTURATION
const CREATE_USAGE_RECORD = `
  mutation appUsageRecordCreate($price: MoneyInput!, $description: String!, $subscriptionLineItemId: ID!) {
    appUsageRecordCreate(
      price: $price
      description: $description
      subscriptionLineItemId: $subscriptionLineItemId
    ) {
      userErrors {
        field
        message
      }
      appUsageRecord {
        id
      }
    }
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload, admin } = await authenticate.webhook(request);

  if (!shop || !admin) {
    return new Response();
  }

  const { checkout_token, total_price, currency } = payload;

  if (!checkout_token) {
    return new Response();
  }

  const abandonedCheckout = await db.abandonedCheckout.findUnique({
    where: { checkoutToken: checkout_token },
  });

  if (abandonedCheckout && abandonedCheckout.status === "relancé") {
    console.log(`🎉 Commande détectée pour un panier relancé ! Checkout Token: ${checkout_token}`);

    await db.abandonedCheckout.update({
      where: { id: abandonedCheckout.id },
      data: { status: "récupéré" },
    });
    console.log(`✅ Statut du panier ${abandonedCheckout.id} mis à jour en "récupéré".`);

    try {
      // Étape A : Trouver l'ID de la ligne d'abonnement d'usage
      const subscriptionResponse = await admin.graphql(GET_USAGE_SUBSCRIPTION_LINE_ITEM);
      const subscriptionResponseJson = await subscriptionResponse.json();
      const activeSubscriptions = subscriptionResponseJson.data?.currentAppInstallation?.activeSubscriptions;

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        console.error("❌ Erreur : Aucune souscription active trouvée pour la boutique.");
        return new Response();
      }
      
      let usageLineItemId = null;
      // On cherche la ligne spécifique à l'usage
      for (const sub of activeSubscriptions) {
        for (const lineItem of sub.lineItems) {
          if (lineItem.plan.pricingDetails.__typename === 'AppUsagePricing') {
            usageLineItemId = lineItem.id;
            break;
          }
        }
        if (usageLineItemId) break;
      }

      if (!usageLineItemId) {
        console.error("❌ Erreur : Aucune ligne d'abonnement de type 'Usage' trouvée.");
        return new Response();
      }

      // Étape B : Créer l'enregistrement de facturation avec le bon ID
      const commissionAmount = parseFloat(total_price) * 0.18;
      const description = `Commission de 18% sur la commande récupérée (Panier #${abandonedCheckout.id})`;

      const variables = {
        subscriptionLineItemId: usageLineItemId,
        price: {
          amount: commissionAmount,
          currencyCode: currency,
        },
        description: description,
      };

      console.log(`Facturation d'une commission de ${commissionAmount} ${currency} sur la ligne ${usageLineItemId}...`);
      const usageResponse = await admin.graphql(CREATE_USAGE_RECORD, { variables });
      const usageResponseJson = await usageResponse.json();
      const errors = usageResponseJson.data?.appUsageRecordCreate?.userErrors;

      if (errors && errors.length > 0) {
        console.error("❌ Erreur lors de la création de l'enregistrement de facturation:", errors);
      } else {
        console.log("✅ Enregistrement de facturation créé avec succès !");
      }
      
    } catch (e: any) {
        console.error("❌ Une erreur GraphQL est survenue lors de la facturation:", e.message);
    }
    
  } else {
    console.log("Commande non issue d'une relance active, on l'ignore.");
  }

  return new Response();
};