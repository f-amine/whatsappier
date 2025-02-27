'use server'
import { prisma } from "@/lib/db";
import { Device, DeviceStatus, Prisma } from "@prisma/client";
import { getCurrentUser } from "../sessions";
import { checkConnectionStatus } from "../mutations/devices";

export interface DeviceWithMetadata extends Device {
  metadata: Record<string, any> | null;
}

export interface GetDevicesOptions {
  status?: DeviceStatus;
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface PaginatedDeviceResponse {
  data: DeviceWithMetadata[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export async function getDevices({
  status,
  cursor,
  limit = 10,
  search,
}: GetDevicesOptions = {}): Promise<PaginatedDeviceResponse> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const where: Prisma.DeviceWhereInput = {
      userId: user.id,
      ...(status && { status }),
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode
            }
          },
          {
            phoneNumber: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode
            }
          }
        ]
      })
    };

    const take = cursor ? limit + 1 : limit;
    const skip = cursor ? 1 : 0;

    const devices = await prisma.device.findMany({
      where,
      take,
      skip,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        connections: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Check and update status for each device
    const statusUpdates = await Promise.all(
      devices.map(async (device) => {
        try {
          const statusCheck = await checkConnectionStatus(device.name);
          return { ...device, status: statusCheck.status };
        } catch (error) {
          console.error(`Error checking status for device ${device.name}:`, error);
          return device; 
        }
      })
    );

    let hasNextPage = false;
    let nextCursor: string | undefined;
    let hasPreviousPage = !!cursor;
    let previousCursor: string | undefined;

    // If we got an extra item, we have a next page
    if (statusUpdates.length > limit) {
      hasNextPage = true;
      statusUpdates.pop(); // Remove the extra item
      nextCursor = statusUpdates[statusUpdates.length - 1]?.id;
    }

    if (cursor) {
      const previousItem = await prisma.device.findMany({
        where,
        take: 1,
        skip: 0,
        cursor: { id: cursor },
        orderBy: {
          updatedAt: "asc",
        },
      });
      previousCursor = previousItem[0]?.id;
    }

    const transformedDevices = statusUpdates.map((device) => ({
      ...device,
      metadata: device.metadata as Record<string, any> | null,
    }));

    // Get total count for informational purposes
    const totalCount = await prisma.device.count({ where });

    return {
      data: transformedDevices,
      totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    };
  } catch (error) {
    console.error("Error fetching devices:", error);
    throw error;
  }
}

export async function getDeviceById(id: string): Promise<DeviceWithMetadata | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!id) throw new Error("Device ID is required");

  try {
    const device = await prisma.device.findFirst({
      where: { 
        id,
        userId: user.id
      },
      include: {
        connections: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!device) return null;

    return {
      ...device,
      metadata: device.metadata as Record<string, any> | null,
    };
  } catch (error) {
    console.error("Error fetching device:", error);
    throw error;
  }
}

