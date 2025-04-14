/*
  Warnings:

  - The values [PENDING,SENDING,DELIVERED,READ] on the enum `RunStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[paddleCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `config` to the `Automation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateDefinitionId` to the `Automation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Run` table without a default value. This is not possible if the table is not empty.
  - Made the column `automationId` on table `Run` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'NOT_CONFIRMED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('COMPLETED', 'ABANDONED', 'RECOVERED');

-- CreateEnum
CREATE TYPE "PaddleSubscriptionStatus" AS ENUM ('active', 'trialing', 'paused', 'canceled', 'past_due');

-- AlterEnum
BEGIN;
CREATE TYPE "RunStatus_new" AS ENUM ('RUNNING', 'WAITING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
ALTER TABLE "Run" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Run" ALTER COLUMN "status" TYPE "RunStatus_new" USING ("status"::text::"RunStatus_new");
ALTER TYPE "RunStatus" RENAME TO "RunStatus_old";
ALTER TYPE "RunStatus_new" RENAME TO "RunStatus";
DROP TYPE "RunStatus_old";
ALTER TABLE "Run" ALTER COLUMN "status" SET DEFAULT 'RUNNING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Automation" DROP CONSTRAINT "Automation_connectionId_fkey";

-- DropForeignKey
ALTER TABLE "Automation" DROP CONSTRAINT "Automation_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "Automation" DROP CONSTRAINT "Automation_templateId_fkey";

-- DropForeignKey
ALTER TABLE "Run" DROP CONSTRAINT "Run_automationId_fkey";

-- DropForeignKey
ALTER TABLE "Run" DROP CONSTRAINT "Run_connectionId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "Usage" DROP CONSTRAINT "Usage_subscriptionId_fkey";

-- DropIndex
DROP INDEX "Run_connectionId_idx";

-- DropIndex
DROP INDEX "Run_phoneNumber_idx";

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "config" JSONB NOT NULL,
ADD COLUMN     "templateDefinitionId" TEXT NOT NULL,
ALTER COLUMN "connectionId" DROP NOT NULL,
ALTER COLUMN "templateId" DROP NOT NULL,
ALTER COLUMN "deviceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Run" DROP COLUMN "createdAt",
DROP COLUMN "message",
DROP COLUMN "metadata",
DROP COLUMN "phoneNumber",
DROP COLUMN "updatedAt",
ADD COLUMN     "context" JSONB,
ADD COLUMN     "currentStepId" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stepOutputs" JSONB,
ADD COLUMN     "triggerPayload" JSONB,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "automationId" SET NOT NULL,
ALTER COLUMN "connectionId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'RUNNING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "paddleCustomerId" TEXT;

-- DropTable
DROP TABLE "Subscription";

-- CreateTable
CREATE TABLE "paddle_subscriptions" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "status" "PaddleSubscriptionStatus" NOT NULL,
    "priceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paddleCustomerId" TEXT NOT NULL,
    "scheduledChange" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paddle_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'ABANDONED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paddle_subscriptions_subscriptionId_key" ON "paddle_subscriptions"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "paddle_subscriptions_userId_key" ON "paddle_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "paddle_subscriptions_userId_idx" ON "paddle_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "Order_connectionId_idx" ON "Order"("connectionId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Checkout_connectionId_idx" ON "Checkout"("connectionId");

-- CreateIndex
CREATE INDEX "Checkout_status_idx" ON "Checkout"("status");

-- CreateIndex
CREATE INDEX "Automation_userId_isActive_idx" ON "Automation"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Automation_templateDefinitionId_idx" ON "Automation"("templateDefinitionId");

-- CreateIndex
CREATE INDEX "Run_userId_idx" ON "Run"("userId");

-- CreateIndex
CREATE INDEX "Run_automationId_idx" ON "Run"("automationId");

-- CreateIndex
CREATE INDEX "Run_userId_status_idx" ON "Run"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_paddleCustomerId_key" ON "users"("paddleCustomerId");

-- AddForeignKey
ALTER TABLE "paddle_subscriptions" ADD CONSTRAINT "paddle_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "paddle_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
