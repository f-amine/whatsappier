export interface ShopifyAuth {
  shopUrl: string
  adminToken: string
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface ShopifyRequestConfig {
  url: string
  method: HttpMethod
  body?: any
  queryParams?: Record<string, string>
  auth: ShopifyAuth
}

async function getShopifyAdminUrl(shopUrl: string): Promise<string> {
  const cleanUrl = shopUrl.replace(/^https?:\/\//, '')
  
  try {
    const response = await fetch(`https://${cleanUrl}/admin`)
    const finalUrl = new URL(response.url)
    
    // If redirected to myshopify.com domain, extract the shop name
    if (finalUrl.hostname.endsWith('.myshopify.com')) {
      const shopName = finalUrl.hostname.replace('.myshopify.com', '')
      return `https://${shopName}.myshopify.com/admin/api/2025-01`
    }
  } catch (error) {
    console.error('Error checking shop URL:', error)
  }
  
  const shopName = cleanUrl
    .replace('.myshopify.com', '')
    .replace('/admin', '')
    .trim()
  
  return `https://${shopName}.myshopify.com/admin/api/2025-01`
}

export async function sendShopifyRequest<T>({
  url,
  method,
  body,
  queryParams,
  auth,
}: ShopifyRequestConfig): Promise<T> {
  const adminUrl = await getShopifyAdminUrl(auth.shopUrl)
  const queryString = queryParams
    ? `?${new URLSearchParams(queryParams).toString()}`
    : ''
    
  const fullUrl = `${adminUrl}${url}${queryString}`

  const response = await fetch(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': auth.adminToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  return response.json()
}

export async function validateShopifyCredentials(auth: ShopifyAuth): Promise<{
  valid: boolean
  error?: string
  shopData?: any
  normalizedShopUrl?: string
}> {
  try {
    const adminUrl = await getShopifyAdminUrl(auth.shopUrl)
    const normalizedShopUrl = new URL(adminUrl).hostname
    
    const data = await sendShopifyRequest({
      auth: {
        ...auth,
        shopUrl: normalizedShopUrl
      },
      method: 'GET',
      url: '/shop.json',
    })
    
    return {
      valid: true,
      shopData: data,
      normalizedShopUrl
    }
  } catch (e) {
    return {
      valid: false,
      error: 'Invalid Shop URL or Admin Token'
    }
  }
}
