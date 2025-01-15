-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('SHOPIFY', 'LIGHTFUNNELS', 'GOOGLE_SHEETS');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'SENDING', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "FailedRunStatus" AS ENUM ('PENDING', 'RETRYING', 'RESOLVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'CONNECTING', 'ERROR');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('WEBHOOK', 'SCHEDULE', 'API', 'EVENT');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "connectionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "trigger" "TriggerType" NOT NULL,
    "triggerConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "credentials" JSONB NOT NULL,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceId" TEXT,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "category" TEXT NOT NULL DEFAULT 'order_confirmation',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "recipients" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "automationId" TEXT,
    "connectionId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "templateId" TEXT,
    "broadcastId" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetry" TIMESTAMP(3),
    "metadata" JSONB,
    "status" "FailedRunStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailedRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "connectionsUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaLeft" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "SubStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "messageQuota" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Device_name_key" ON "Device"("name");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Automation_userId_idx" ON "Automation"("userId");

-- CreateIndex
CREATE INDEX "Automation_connectionId_idx" ON "Automation"("connectionId");

-- CreateIndex
CREATE INDEX "Automation_deviceId_idx" ON "Automation"("deviceId");

-- CreateIndex
CREATE INDEX "Connection_userId_platform_idx" ON "Connection"("userId", "platform");

-- CreateIndex
CREATE INDEX "Template_userId_idx" ON "Template"("userId");

-- CreateIndex
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

-- CreateIndex
CREATE INDEX "Broadcast_connectionId_idx" ON "Broadcast"("connectionId");

-- CreateIndex
CREATE INDEX "Run_status_idx" ON "Run"("status");

-- CreateIndex
CREATE INDEX "Run_connectionId_idx" ON "Run"("connectionId");

-- CreateIndex
CREATE INDEX "Run_phoneNumber_idx" ON "Run"("phoneNumber");

-- CreateIndex
CREATE INDEX "FailedRun_runId_status_idx" ON "FailedRun"("runId", "status");

-- CreateIndex
CREATE INDEX "Usage_subscriptionId_periodStart_periodEnd_idx" ON "Usage"("subscriptionId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Analytics_userId_periodStart_periodEnd_idx" ON "Analytics"("userId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailedRun" ADD CONSTRAINT "FailedRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
