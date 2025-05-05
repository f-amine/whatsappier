import { automationWorker } from './lib/queue';

console.log('[Worker Process] Starting...');

const isRunning = automationWorker.isRunning();

if (isRunning) {
    console.log('[Worker Process] Worker is running and processing jobs.');
} else {
    console.error('[Worker Process] Worker failed to report as running immediately after initialization.');
}

const keepAliveInterval = setInterval(() => {
    const currentStatus = automationWorker.isRunning();
    if (currentStatus) {
        console.log('[Worker Process] Health check: Worker is running properly.');
    } else {
        console.error('[Worker Process] Health check: Worker is not running! Attempting to recover...');
        // You might want to add recovery logic here if needed
    }
}, 60000); // Keep alive check every minute

console.log('[Worker Process] Setup complete. Waiting for jobs...');

// Ensure the interval is cleared on shutdown (optional but good practice)
const cleanup = async (signal: string) => {
    console.log(`[Worker Process] Cleaning up interval due to ${signal}...`);
    clearInterval(keepAliveInterval);
    // The gracefulShutdown function in lib/queue.ts should handle closing the worker/queue/redis
};

process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));
