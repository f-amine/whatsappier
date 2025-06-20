import { prisma } from '@/lib/db';
import { Automation, Prisma, Run, RunStatus } from '@prisma/client'; // Import Prisma, RunStatus
import { getAutomationTemplateById } from '../templates/registry';
import { executeLfOrderToWhatsapp, handleLfOrderReply } from '../execution/lf-order-to-whatsapp';
import { executeLfAbandonedCheckoutRecovery } from '../execution/lf-abandoned-checkout-recovery';
import { executeGsheetsOrderSync } from '../execution/lf-order-sheet-sync';


type ExecutionFunction = (
    automation: Automation,
    triggerPayload: any,
    config: any,
    runId: string
) => Promise<void>;

type ReplyHandlerFunction = (
    automation: Automation,
    run: Run,
    replyText: string,
    replyMessageId: string
) => Promise<{
    status: RunStatus;
    result: Prisma.JsonObject;
    errorMessage?: string;
}>;

const executionLogicMap: Record<string, ExecutionFunction> = {
    'executeLfOrderToWhatsapp': executeLfOrderToWhatsapp,
    'executeLfAbandonedCheckoutRecovery': executeLfAbandonedCheckoutRecovery,
    'executeGsheetsOrderSync': executeGsheetsOrderSync, 
};

const replyHandlerMap: Record<string, ReplyHandlerFunction> = {
    'handleLfOrderReply': handleLfOrderReply,
};

export class AutomationExecutor {

    static async startExecution(automationId: string, triggerPayload: any) {
        console.log(`Starting execution for automation: ${automationId}`);
        let automation: Automation | null = null;
        let run: { id: string } | null = null;

        try {
            // 1. Fetch automation
            automation = await prisma.automation.findUnique({ where: { id: automationId } });
            if (!automation || !automation.isActive) { console.warn(`Automation ${automationId} not found or inactive.`); return; }

            // 2. Create Run record
            run = await prisma.run.create({
                data: {
                    automationId: automation.id,
                    userId: automation.userId,
                    status: RunStatus.RUNNING,
                    triggerPayload: triggerPayload as Prisma.JsonObject,
                    startedAt: new Date(),
                    connectionId: automation.connectionId,
                    templateId: automation.templateId,
                },
                select: { id: true }
            });
            console.log(`Created run record: ${run.id}`);

            // 3. Find template definition
            const template = getAutomationTemplateById(automation.templateDefinitionId);
            if (!template) throw new Error(`Automation template definition '${automation.templateDefinitionId}' not found.`);

            // 4. Get execution logic
            const execute = executionLogicMap[template.executionLogicIdentifier];
            if (!execute) throw new Error(`Execution logic '${template.executionLogicIdentifier}' not implemented.`);

            // 5. Validate config
            const configValidation = template.configSchema.safeParse(automation.config);
            if (!configValidation.success) {
                console.error(`[Config Validation Error] Automation ${automationId}:`, configValidation.error.errors);
                throw new Error(`Stored config for automation ${automationId} is invalid.`);
            }
            const validatedConfig = configValidation.data;

            // 6. Execute the logic
            await execute(automation, triggerPayload, validatedConfig, run.id);

            // 7. Update Run status (check if still RUNNING)
            const currentRunState = await prisma.run.findUnique({ where: { id: run.id }, select: { status: true } });
            if (currentRunState?.status === RunStatus.RUNNING) {
                await prisma.run.update({
                    where: { id: run.id },
                    data: { status: RunStatus.SUCCEEDED, finishedAt: new Date() },
                });
                console.log(`Execution successful for run: ${run.id} (marked as SUCCEEDED)`);
            } else {
                console.log(`Run ${run.id} status is ${currentRunState?.status}, not updating to SUCCEEDED.`);
            }

        } catch (error: any) {
            console.error(`[Execution Error] Automation ${automationId}, Run ${run?.id}:`, error);
            // 8. Update Run to FAILED
            if (run?.id) {
                await prisma.run.update({
                    where: { id: run.id },
                    data: { status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: error.message || 'Unknown execution error' },
                }).catch(updateErr => console.error(`[DB Error] Failed to update run ${run?.id} to FAILED:`, updateErr));
            }
        }
    }

    static async processReply(runId: string, replyText: string, replyMessageId: string) {
        console.log(`[Executor] Processing reply for Run ID: ${runId}`);
        let run = null;
        let automation = null;
        let template = null;

        try {
            // 1. Fetch Run and associated Automation with full data
            run = await prisma.run.findUnique({
                where: { id: runId },
                include: { automation: true }
            });

            if (!run) {
                console.error(`[Executor] Run ${runId} not found during reply processing.`);
                return;
            }
            if (run.status !== RunStatus.WAITING_REPLY && run.status !== RunStatus.PROCESSING_REPLY) {
                console.warn(`[Executor] Run ${runId} is not in WAITING_REPLY or PROCESSING_REPLY state (current: ${run.status}). Skipping reply processing.`);
                return;
            }

            automation = run.automation;
            if (!automation) {
                throw new Error(`Automation data missing for Run ${runId}.`);
            }

            // 2. Get Template Definition
            template = getAutomationTemplateById(automation.templateDefinitionId);
            if (!template) {
                throw new Error(`Automation template definition '${automation.templateDefinitionId}' not found for Run ${runId}.`);
            }

            // 3. Check if this template handles replies
            if (!template.awaitsReply) {
                console.warn(`[Executor] Received reply for Run ${runId}, but template '${template.id}' does not expect replies. Ignoring.`);
                return;
            }

            // 4. Update to PROCESSING_REPLY status
            await prisma.run.update({
                where: { id: runId },
                data: { status: RunStatus.PROCESSING_REPLY }
            });

            // 5. Delegate to template-specific reply handler
            if (!template.replyHandlerIdentifier) {
                throw new Error(`Reply handler identifier missing for template '${template.id}'.`);
            }

            const replyHandler = replyHandlerMap[template.replyHandlerIdentifier];
            if (!replyHandler) {
                throw new Error(`Reply handler '${template.replyHandlerIdentifier}' not found in registry.`);
            }

            // 6. Execute the appropriate reply handler and get results
            const handlerResult = await replyHandler(
                automation,
                run,
                replyText,
                replyMessageId
            );

            // 7. Update Run with the handler results
            await prisma.run.update({
                where: { id: runId },
                data: {
                    status: handlerResult.status,
                    finishedAt: new Date(),
                    aiResult: handlerResult.result,
                    errorMessage: handlerResult.errorMessage
                }
            });
            console.log(`[Executor] Run ${runId} updated to final status: ${handlerResult.status}`);

        } catch (error: any) {
            console.error(`[Executor] Critical error processing reply for Run ${run?.id ?? runId}:`, error);
            
            if (run?.id) {
                await prisma.run.update({
                    where: { id: run.id },
                    data: {
                        status: RunStatus.FAILED,
                        finishedAt: new Date(),
                        errorMessage: `Reply Processing Error: ${error.message}`,
                    },
                }).catch(updateErr => console.error(`[Executor DB Error] Failed to update run ${run?.id} to FAILED after reply processing error:`, updateErr));
            }
        }
    }
}

