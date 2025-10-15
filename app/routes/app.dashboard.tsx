import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendWhatsappRecoveryMessage } from "../services/whatsapp.server";

// La fonction `loader` ne change pas, elle récupère toujours les données
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const abandonedCheckouts = await db.abandonedCheckout.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  return { abandonedCheckouts };
};

// NOUVELLE VERSION DE LA FONCTION ACTION
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const checkoutId = formData.get("checkoutId") as string;

  try {
    await sendWhatsappRecoveryMessage({
      checkoutId: parseInt(checkoutId),
      shop: session.shop,
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
};


export default function DashboardPage() {
  const { abandonedCheckouts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const isSubmitting = fetcher.state === "submitting";
  
  return (
    <s-page heading="Paniers Abandonnés">
      {fetcher.data?.success && <s-banner status="success">Message de relance envoyé !</s-banner>}
      {fetcher.data?.error && <s-banner status="critical">{fetcher.data.error}</s-banner>}
      <s-section>
        {abandonedCheckouts.length === 0 ? (
          <s-card title="Aucun panier abandonné pour le moment">
            <s-paragraph>
              Lorsqu'un client commencera un processus de paiement et
              renseignera son numéro de téléphone, le panier apparaîtra ici.
            </s-paragraph>
          </s-card>
        ) : (
          <s-card>
            <s-table>
              <s-table-head>
                <s-table-row>
                  <s-table-header-cell>Client</s-table-header-cell>
                  <s-table-header-cell>Téléphone</s-table-header-cell>
                  <s-table-header-cell>Total</s-table-header-cell>
                  <s-table-header-cell>Statut</s-table-header-cell>
                  <s-table-header-cell>Date</s-table-header-cell>
                  <s-table-header-cell>Action</s-table-header-cell>
                </s-table-row>
              </s-table-head>
              <s-table-body>
                {abandonedCheckouts.map((checkout) => (
                  <s-table-row key={checkout.id}>
                    <s-table-cell>
                      {checkout.customerName || "N/A"}
                    </s-table-cell>
                    <s-table-cell>{checkout.customerPhone}</s-table-cell>
                    <s-table-cell>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(checkout.cartTotal)}
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge status={checkout.status === 'relancé' ? 'success' : 'warning'}>
                        {checkout.status}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      {new Date(checkout.createdAt).toLocaleString("fr-FR")}
                    </s-table-cell>
                    <s-table-cell>
                      {checkout.status === "abandoned" && (
                        <fetcher.Form method="post">
                          <input type="hidden" name="checkoutId" value={checkout.id} />
                          <s-button type="submit" {...(isSubmitting ? { loading: true } : {})}>
                            Relancer
                          </s-button>
                        </fetcher.Form>
                      )}
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-card>
        )}
      </s-section>
    </s-page>
  );
}