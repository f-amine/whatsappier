import { getSubscriptions } from "@/lib/mutations/subscriptions";
import { NoSubscriptionView } from "./NoSubscriptionView";
import { SubscriptionDetail } from "./SubscriptionDetail";

export async function Subscriptions() {
  const { data: subscriptions } = await getSubscriptions();
  
  if (!subscriptions || subscriptions.length === 0) {
    return <NoSubscriptionView />;
  }
  
  return <SubscriptionDetail subscriptionId={subscriptions[0].id} />;
}

