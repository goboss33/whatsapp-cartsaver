import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendWhatsappRecoveryMessage } from "../services/whatsapp.server";

// Le loader calcule les statistiques et prépare les données pour le graphique
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const abandonedCheckouts = await db.abandonedCheckout.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  const totalRecovered = abandonedCheckouts.filter(c => c.status === 'récupéré').length;
  const totalSent = abandonedCheckouts.filter(c => c.status === 'relancé' || c.status === 'récupéré').length;
  const totalAbandoned = abandonedCheckouts.filter(c => c.status === 'abandoned').length;
  const recoveryRate = totalSent > 0 ? (totalRecovered / totalSent) * 100 : 0;
  const totalRecoveredValue = abandonedCheckouts
    .filter(c => c.status === 'récupéré')
    .reduce((sum, c) => sum + c.cartTotal, 0);

  // Préparation des données pour le graphique
  const chartData = [
    { name: 'Récupérés', value: totalRecovered, fill: '#3a7d44' },
    { name: 'Relancés (non convertis)', value: totalSent - totalRecovered, fill: '#0066cc' },
    { name: 'Abandonnés (non relancés)', value: totalAbandoned, fill: '#dba917' },
  ];

  return {
    abandonedCheckouts,
    stats: {
      totalRecovered,
      recoveryRate: recoveryRate.toFixed(2),
      totalRecoveredValue,
    },
    chartData,
  };
};

// La fonction action reste inchangée
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

// Composant pour le graphique qui ne s'affiche que côté client
function ClientOnlyChart({ data }: { data: any[] }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ height: '300px' }} />; // Placeholder
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" name="Nombre de paniers" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const { abandonedCheckouts, stats, chartData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const isSubmitting = fetcher.state === "submitting";

  const getBadgeStatus = (status: string) => {
    switch (status) {
      case 'récupéré':
        return 'success'; // Vert
      case 'relancé':
        return 'info'; // Bleu
      case 'abandoned':
        return 'warning'; // Jaune
      default:
        return 'default';
    }
  };

  return (
    <s-page heading="Paniers Abandonnés">
      {fetcher.data?.success && <s-banner status="success">Message de relance envoyé !</s-banner>}
      {fetcher.data?.error && <s-banner status="critical">{fetcher.data.error}</s-banner>}

      <s-section>
        {/* NOUVELLE STRUCTURE POUR LES STATISTIQUES */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <s-card title="Taux de Récupération" subdued>
              <s-text variant="heading-2xl" as="p">{stats.recoveryRate}%</s-text>
            </s-card>
          </div>
          <div style={{ flex: 1 }}>
            <s-card title="Montant Récupéré" subdued>
              <s-text variant="heading-2xl" as="p">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(stats.totalRecoveredValue)}
              </s-text>
            </s-card>
          </div>
        </div>
      </s-section>
      
      <s-section heading="Vue d'ensemble">
        <s-card>
          <ClientOnlyChart data={chartData} />
        </s-card>
      </s-section>

      <s-section>
        {abandonedCheckouts.length === 0 ? (
          <s-card title="Aucun panier abandonné pour le moment" subdued>
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
                      <s-badge status={getBadgeStatus(checkout.status)}>
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