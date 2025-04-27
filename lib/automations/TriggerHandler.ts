import { AutomationExecutor } from './engine/AutomationExecutor'; // Import the executor
import { WebhookPayload } from './helpers/lightfunnels'; // Keep this if needed

export class TriggerHandler {

  // Updated to handle generic webhooks routed by unique automation ID
  static async handleGenericWebhook(
    automationId: string, // The ID from the webhook URL
    payload: any, // The raw payload from the webhook source
    // Optional: sourcePlatform?: string // To double-check if needed
  ): Promise<void> {
    console.log(`Handling generic webhook for automation ${automationId}`);

    try {
        // Directly start execution using the automation ID from the URL
        // The executor will fetch the automation, check if active, and run it
        await AutomationExecutor.startExecution(automationId, payload);

    } catch (error) {
      console.error(`Error handling generic webhook for automation ${automationId}:`, error);
      // Log or handle error as needed
    }
  }

  // Keep the old LightFunnels specific handler if you still use the older webhook routes
  // Otherwise, remove it and use handleGenericWebhook for all webhook triggers.
  // Example:
  // static async handleLightFunnelsWebhook(
  //   triggerType: string,
  //   payload: WebhookPayload,
  //   automationId: string
  // ): Promise<void> {
  //    console.warn("Deprecated handleLightFunnelsWebhook called. Use handleGenericWebhook.");
  //    await this.handleGenericWebhook(automationId, payload);
  // }

  // TODO: Add handlers for other trigger types (SCHEDULE, API, EVENT)
  // These would query the DB for automations matching the schedule/API call
  // and then call AutomationExecutor.startExecution for each.

  // Example for a scheduled trigger (needs a scheduler like cron)
  // static async handleScheduledTrigger(schedule: string) { // e.g., 'every_hour'
  //   const automations = await prisma.automation.findMany({
  //     where: {
  //       isActive: true,
  //       trigger: TriggerType.SCHEDULE,
  //       triggerConfig: { path: ['schedule'], equals: schedule }
  //     }
  //   });
  //   console.log(`Found ${automations.length} automations for schedule: ${schedule}`);
  //   for (const automation of automations) {
  //     // Schedule execution (don't await all in sequence for long tasks)
  //     AutomationExecutor.startExecution(automation.id, { scheduleTime: new Date().toISOString() });
  //   }
  // }
}
