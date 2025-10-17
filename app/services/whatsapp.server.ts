import db from "../db.server";

export async function sendWhatsappRecoveryMessage({ checkoutId, shop }: { checkoutId: number; shop: string; }) {
  const [checkout, twilioConfig] = await Promise.all([
    db.abandonedCheckout.findUnique({ where: { id: checkoutId } }),
    db.twilioConfig.findUnique({ where: { shop } }),
  ]);

  if (!checkout || !twilioConfig || !checkout.customerPhone || !checkout.abandonedCheckoutUrl) {
	console.error(`[DEBUG SEND] Impossible de trouver les informations pour le panier ${checkoutId}. URL manquante: ${!checkout.abandonedCheckoutUrl}`);
    throw new Error("Impossible de trouver le panier, le numéro, le lien ou la configuration Twilio.");
  }
  
  // AJOUTEZ CETTE LIGNE DE DÉBOGAGE
  console.log(`[DEBUG SEND] Préparation de l'envoi pour le panier ${checkoutId}. URL utilisée: ${checkout.abandonedCheckoutUrl}`);

  if (checkout.status !== 'abandoned') {
    console.log(`Le panier ${checkoutId} n'est plus abandonné. Envoi annulé.`);
    return { message: "Envoi annulé, le statut a changé." };
  }

  const messageBody = `Bonjour ${checkout.customerName || ''} ! Nous avons remarqué que vous avez laissé des articles dans votre panier. Vous pouvez finaliser votre commande ici : ${checkout.abandonedCheckoutUrl}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${twilioConfig.accountSid}:${twilioConfig.authToken}`).toString("base64"),
      },
      body: new URLSearchParams({
        To: `whatsapp:${checkout.customerPhone}`,
        From: `whatsapp:${twilioConfig.phoneNumber}`,
        Body: messageBody,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erreur Twilio : ${errorData.message}`);
  }

  await db.abandonedCheckout.update({
    where: { id: checkout.id },
    data: { status: "relancé" },
  });

  return { success: true };
}