import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Fonction pour récupérer la configuration Twilio existante
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const twilioConfig = await db.twilioConfig.findUnique({
    where: { shop },
  });

  // On retourne directement l'objet
  return { twilioConfig };
};

// Fonction pour sauvegarder et tester la configuration Twilio
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const accountSid = formData.get("accountSid") as string;
  const authToken = formData.get("authToken") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const testNumber = formData.get("testNumber") as string;

  // Sauvegarder la configuration dans la base de données
  await db.twilioConfig.upsert({
    where: { shop },
    update: { accountSid, authToken, phoneNumber },
    create: { shop, accountSid, authToken, phoneNumber },
  });

  // Envoyer un message de test avec Twilio
  if (testNumber) {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
              "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          },
          body: new URLSearchParams({
            To: `whatsapp:${testNumber}`,
            From: `whatsapp:${phoneNumber}`,
            Body: "Ceci est un message de test depuis votre application Shopify!",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        // On retourne un objet d'erreur
        return { error: errorData.message || "Une erreur inconnue est survenue avec Twilio.", success: false };
      }

      // On retourne un objet de succès
      return { success: true, message: "Message de test envoyé avec succès !" };
    } catch (error: any) {
      // On retourne un objet d'erreur
      return { error: error.message || "Échec de l'envoi du message de test.", success: false };
    }
  }
  
  // On retourne un objet de succès pour la sauvegarde
  return { success: true, message: "Configuration sauvegardée avec succès !" };
};

export default function WhatsappConfigPage() {
  const { twilioConfig } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [accountSid, setAccountSid] = useState(twilioConfig?.accountSid || "");
  const [authToken, setAuthToken] = useState(twilioConfig?.authToken || "");
  const [phoneNumber, setPhoneNumber] = useState(
    twilioConfig?.phoneNumber || ""
  );
  const [testNumber, setTestNumber] = useState("");

  const isSaving = fetcher.state === "submitting";
  const actionData = fetcher.data;

  return (
    <s-page heading="Configuration WhatsApp (Twilio)">
      <s-section heading="Paramètres Twilio">
        <s-paragraph>
          Veuillez entrer vos informations d'identification Twilio ci-dessous.
        </s-paragraph>
        <fetcher.Form method="post">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="accountSid"
              label="Account SID"
              value={accountSid}
              onChange={(e) => setAccountSid(e.currentTarget.value)}
              required
            />
            <s-text-field
              name="authToken"
              label="Auth Token"
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.currentTarget.value)}
              required
            />
            <s-text-field
              name="phoneNumber"
              label="Numéro de téléphone Twilio (WhatsApp)"
              helpText="Format: +14155238886"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.currentTarget.value)}
              required
            />
            <s-button type="submit" {...(isSaving ? { loading: true } : {})}>
              Sauvegarder
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>
      <s-section heading="Tester la configuration">
        <s-paragraph>
          Envoyez un message de test pour vérifier que votre configuration est
          correcte.
        </s-paragraph>
        <fetcher.Form method="post">
           {/* Champs cachés pour inclure les identifiants lors du test */}
           <input type="hidden" name="accountSid" value={accountSid} />
           <input type="hidden" name="authToken" value={authToken} />
           <input type="hidden" name="phoneNumber" value={phoneNumber} />
          <s-stack direction="inline" gap="base" align="end">
            <s-text-field
              name="testNumber"
              label="Numéro de test WhatsApp"
              helpText="Format: +33612345678"
              value={testNumber}
              onChange={(e) => setTestNumber(e.currentTarget.value)}
            />
            <s-button type="submit" {...(isSaving ? { loading: true } : {})}>
              Envoyer le test
            </s-button>
          </s-stack>
        </fetcher.Form>
        {actionData?.success && <s-banner status="success">{actionData.message}</s-banner>}
        {actionData?.error && <s-banner status="critical">{actionData.error}</s-banner>}
      </s-section>
    </s-page>
  );
}