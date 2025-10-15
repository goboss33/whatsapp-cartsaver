import { PrismaClient } from "@prisma/client";
// La seule modification est ici, avec l'ajout de ".js"
import { sendWhatsappRecoveryMessage } from "../app/services/whatsapp.server";

const prisma = new PrismaClient();

console.log("🚀 Worker démarré ! En attente de paniers à relancer...");

async function processAbandonedCheckouts() {
  console.log("🕵️  Vérification des paniers abandonnés...");

  const sessions = await prisma.session.findMany({
    select: { shop: true },
  });
  const shops = [...new Set(sessions.map((session) => session.shop))];

  for (const shop of shops) {
    const settings = await prisma.settings.findUnique({
      where: { shop },
    });

    const delayMinutes = settings?.delayMinutes || 60;
    const cutoffDate = new Date(Date.now() - delayMinutes * 60 * 1000);

    const checkoutsToProcess = await prisma.abandonedCheckout.findMany({
      where: {
        shop: shop,
        status: "abandoned",
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (checkoutsToProcess.length > 0) {
      console.log(
        `📬 Trouvé ${checkoutsToProcess.length} panier(s) à relancer pour la boutique ${shop}.`
      );

      for (const checkout of checkoutsToProcess) {
        try {
          await sendWhatsappRecoveryMessage({
            checkoutId: checkout.id,
            shop: shop,
          });
          console.log(`✅ Message envoyé pour le panier ${checkout.id}.`);
        } catch (error) {
          console.error(
            `❌ Erreur lors de l'envoi pour le panier ${checkout.id}:`,
            error
          );
        }
      }
    }
  }
}

setInterval(processAbandonedCheckouts, 60000);