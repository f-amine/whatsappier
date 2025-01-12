import { NextResponse } from 'next/server'
import { exchangeLightFunnelsCode } from '@/lib/connections/lightfunnels'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/en/connections?error=missing_params`
      )
    }

    await exchangeLightFunnelsCode(code, state)

    // Redirect back to connections page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/en/connections?success=connected`
    )
  } catch (error) {
    console.error('Error in LightFunnels callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=connection_failed`
    )
  }
}
