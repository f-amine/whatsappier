import { Platform } from "@prisma/client"

export interface PlatformInfo {
  name: string
  logo: string
  description: string
}

export interface ConnectionCredentials {
  shopify?: {
    shopUrl: string
    adminApiKey: string
  }
  lightfunnels?: {
    accessToken: string
  }
  googleSheets?: {
    refreshToken: string
    accessToken: string
  }
}

export interface PlatformConnectionProps {
  onSuccess: () => void
  onError: (error: Error) => void
  onCancel: () => void
}

export interface PlatformConfig {
  info: PlatformInfo
  platform: Platform
  component?: React.ComponentType<PlatformConnectionProps>
  connectHandler: (props: PlatformConnectionProps) => Promise<void>
}

export const PLATFORM_INFO = {
  [Platform.LIGHTFUNNELS]: {
    name: 'LightFunnels',
    logo: '/platforms/lf.png',
    description: 'Connect your LightFunnels store'
  },
  [Platform.SHOPIFY]: {
    name: 'Shopify',
    logo: '/platforms/shopify.svg',
    description: 'Connect your Shopify store'
  },
  [Platform.GOOGLE_SHEETS]: {
    name: 'Google Sheets',
    logo: '/platforms/google-sheets.svg',
    description: 'Connect to Google Sheets'
  }
} as const
