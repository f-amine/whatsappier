export const handleLightFunnelsOAuth = async ({ onError }: PlatformConnectionProps) => {
  try {
    const state = crypto.randomUUID()
    localStorage.setItem('lightfunnels_oauth_state', state)
    
    const response = await fetch(`/api/connections/lightfunnels/auth-url?state=${state}`)
    if (!response.ok) {
      throw new Error('Failed to generate auth URL')
    }
    
    const data = await response.json()
    if (data.error) {
      throw new Error(data.error)
    }
    
    window.location.href = data.url
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Failed to connect to LightFunnels'))
  }
}
