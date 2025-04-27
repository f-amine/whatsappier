'use server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/sessions';
import { LightFunnelsService, LfError } from '@/lib/automations/helpers/lightfunnels';
import { Platform } from '@prisma/client';

interface FunnelInfo {
    id: string;
    name: string;
}

interface GetFunnelsOptions {
    query?: string;
}

export async function getFunnels(connectionId: string | null | undefined, options: GetFunnelsOptions = {}): Promise<FunnelInfo[]> {
    // 1. Authentication and Basic Validation
    const user = await getCurrentUser();
    if (!user) {
        console.error("[Server Action Error] getLightfunnelsFunnelsAction: Unauthorized");
        throw new Error("Unauthorized");
    }

    if (!connectionId) {
        return []; // Return empty array if no connection is selected yet
    }

    const connection = await prisma.connection.findFirst({
        where: {
            id: connectionId,
            userId: user.id,
            platform: Platform.LIGHTFUNNELS,
            isActive: true,
        },
    });

    if (!connection) {
        console.error(`[Server Action Error] getLightfunnelsFunnelsAction: Connection ${connectionId} not found for user ${user.id}`);
        throw new Error('Connection not found or access denied');
    }

    const credentials = connection.credentials as { accessToken?: string };
    const accessToken = credentials?.accessToken;

    if (!accessToken) {
         console.error(`[Server Action Error] getLightfunnelsFunnelsAction: Missing access token for connection ${connectionId}`);
        throw new Error('Invalid connection credentials');
    }

    const lfService = new LightFunnelsService(accessToken);
    const funnels = await lfService.getFunnels({ query: options.query }); 

    return funnels;
} 