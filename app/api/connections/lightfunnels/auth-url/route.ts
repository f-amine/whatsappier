import { NextResponse } from 'next/server'
import { env } from "@/env.mjs"

const LIGHTFUNNELS_SCOPES = ['funnels', 'orders', 'products', 'analytics', 'customers', 'discounts']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')

    if (!state) {
      return NextResponse.json(
        { error: 'State parameter is required' }, 
        { status: 400 }
      )
    }

    const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/connections/lightfunnels/callback`
    const scopes = LIGHTFUNNELS_SCOPES.join(',')
    
    const url = new URL('https://app.lightfunnels.com/admin/oauth')
    url.searchParams.append('client_id', env.LIGHTFUNNELS_CLIENT_ID)
    url.searchParams.append('redirect_uri', redirectUri)
    url.searchParams.append('scope', scopes)
    url.searchParams.append('state', state)

    return NextResponse.json({ url: url.toString() })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' }, 
      { status: 500 }
    )
  }
}
