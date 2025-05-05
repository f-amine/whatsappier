import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@/env.mjs'; // Assuming Redis URL is in env
import { resumeLfAbandonedCheckoutRecovery } from './automations/execution/lf-abandoned-checkout-recovery'; // Import the resume logic
import { prisma } from './db'; // Import prisma if needed directly in worker logic (though passing ID is better)
import { RunStatus } from '@prisma/client';

const connectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
};

export const redisConnection = new IORedis(connectionOptions);

redisConnection.on('error', err => {
  console.error('[Redis Connection Error]', err);
});

redisConnection.on('connect', () => {
    console.log('[Redis Connection] Connected successfully.');
});


// --- Queue Definition ---
const QUEUE_NAME = 'automation-tasks';

const queueOptions: QueueOptions = {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
            type: 'exponential',
            delay: 1000 * 60 * 5, // Start with 5 min delay for retries
        },
        removeOnComplete: { // Keep completed jobs for a while for inspection
            age: 3600 * 24 * 7 // Keep for 7 days
        },
        removeOnFail: { // Keep failed jobs longer
             age: 3600 * 24 * 30 // Keep for 30 days
        },
    }
};

export const automationQueue = new Queue<{ runId: string }>(QUEUE_NAME, queueOptions);

console.log(`[BullMQ] Queue "${QUEUE_NAME}" initialized.`);

// --- Worker Definition ---
const workerOptions: WorkerOptions = {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
};

// The actual logic executed by the worker
const workerProcessor = async (job: Job<{ runId: string }>) => {
    const { runId } = job.data;
    console.log(`[Worker] Processing job ${job.id} for Run ID: ${runId}`);

    try {
        // It's generally better to fetch the Run inside the resume function
        // to ensure it hasn't been processed elsewhere, but you could fetch here too.
        // We pass the runId to the resume function which handles fetching and status updates.
        const result = await resumeLfAbandonedCheckoutRecovery(runId);

        if (!result.success) {
             // Throw an error to signal failure to BullMQ for retries
            throw new Error(result.message || `Failed to resume run ${runId}`);
        }

        console.log(`[Worker] Successfully processed job ${job.id} for Run ID: ${runId}`);
        // No need to return anything on success for BullMQ processor function
    } catch (error: any) {
        console.error(`[Worker] Error processing job ${job.id} for Run ID ${runId}:`, error);
        // Update Run status to FAILED here as a fallback if resumeLfAbandonedCheckoutRecovery fails critically
         await prisma.run.update({
             where: { id: runId },
             data: { status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: `Worker Error: ${error.message}` },
         }).catch(dbErr => console.error(`[Worker DB Error] Failed update run ${runId} to FAILED:`, dbErr));

        // Re-throw the error so BullMQ handles retries based on queue options
        throw error;
    }
};

// Create the worker instance (but don't necessarily start it here)
export const automationWorker = new Worker<{ runId: string }>(QUEUE_NAME, workerProcessor, workerOptions);

automationWorker.on('completed', (job: Job, result: any) => {
  console.log(`[Worker] Job ${job.id} (Run ID: ${job.data.runId}) completed.`);
});

automationWorker.on('failed', (job: Job | undefined, error: Error) => {
    if (job) {
        console.error(`[Worker] Job ${job.id} (Run ID: ${job.data.runId}) failed after ${job.attemptsMade} attempts:`, error.message);
    } else {
         console.error(`[Worker] A job failed with an unknown ID:`, error.message);
    }
});

automationWorker.on('error', (error: Error) => {
  console.error('[Worker Error Event]', error);
});

console.log(`[BullMQ] Worker for queue "${QUEUE_NAME}" initialized.`);

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Shutting down gracefully...`);
  await automationWorker.close();
  await automationQueue.close();
  await redisConnection.quit();
  console.log('[Worker] Shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
