import { prisma } from "./db";

export async function getUserSubscription(userId: string) {
  try {
    const subscription = await prisma.paddleSubscription.findFirst({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return subscription;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
}

export async function isSubscribed(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) return false;

    return (
      subscription.status === 'active' &&
      (subscription.currentPeriodEnd ? subscription.currentPeriodEnd.getTime() > Date.now() : false)
    );
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}
