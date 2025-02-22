'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Database } from 'lucide-react'

export default function DevSeedButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSeed = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/dev/seed', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      toast.success('Test data created', {
        description: 
          `Created ${data.stats.devices} devices, ` +
          `${data.stats.templates} templates, ` +
          `${data.stats.connections} connections, ` +
          `${data.stats.automations} automations, ` +
          `${data.stats.orders} orders, and ` +
          `${data.stats.checkouts} checkouts`
      })
    } catch (error) {
      toast.error('Failed to create test data', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleSeed} 
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      {isLoading ? 'Creating Test Data...' : 'Generate Test Data'}
    </Button>
  )
}
