import { Platform } from "@prisma/client"
import { PLATFORM_INFO, PlatformConfig} from "@/types/platform-connection"
import { ShopifyConnectionForm } from "@/components/platforms/shopify/ShopifyConnection"
import { handleLightFunnelsOAuth } from "./lightfunnels/handleLfOauth"

export const platformRegistry: Record<Platform, PlatformConfig> = {
  [Platform.SHOPIFY]: {
    info: PLATFORM_INFO[Platform.SHOPIFY],
    platform: Platform.SHOPIFY,
    component: ShopifyConnectionForm,
    connectHandler: async (props) => {
      // The handler is in the component for Shopify
    }
  },
  [Platform.LIGHTFUNNELS]: {
    info: PLATFORM_INFO[Platform.LIGHTFUNNELS],
    platform: Platform.LIGHTFUNNELS,
    connectHandler: handleLightFunnelsOAuth
  },
  [Platform.GOOGLE_SHEETS]: {
    info: PLATFORM_INFO[Platform.GOOGLE_SHEETS],
    platform: Platform.GOOGLE_SHEETS,
    connectHandler: async ({ onSuccess, onError, onCancel }) => {
      try {
        const response = await fetch("/api/connections/google-sheets/auth-url");
        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Failed to get Google Sheets authentication URL");
        }
      } catch (error) {
        console.error("Google Sheets connection error:", error);
        onError(error instanceof Error ? error : new Error("Google Sheets connection failed"));
      }
    }
  }
}

export const getPlatformConfig = (platform: Platform): PlatformConfig => {
  const config = platformRegistry[platform]
  if (!config) {
    throw new Error(`Platform ${platform} not supported`)
  }
  return config
}
