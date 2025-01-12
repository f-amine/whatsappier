'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Platform } from '@prisma/client'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlatformCard } from './PlatformCards'

interface CreateConnectionDialogProps {
  children: React.ReactNode
  onRefresh?: () => void
}

// Define platform metadata
const PLATFORM_INFO = {
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

export function CreateConnectionDialog({
  children,
  onRefresh,
}: CreateConnectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  const filteredPlatforms = Object.values(Platform).filter(platform => 
    PLATFORM_INFO[platform].name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'connected' || error) {
      setOpen(false)
      
      if (success === 'connected') {
        toast.success('Connection successful')
        onRefresh?.()
      } else if (error) {
        toast.error('Connection failed', {
          description: error === 'missing_params' 
            ? 'Missing required parameters' 
            : 'Failed to establish connection'
        })
      }

      const newUrl = window.location.pathname
      router.replace(newUrl)
    }
  }, [searchParams, onRefresh, router])

  const handleConnect = async (platform: Platform) => {
    try {
      setIsLoading(true)

      switch (platform) {
        case Platform.LIGHTFUNNELS: {
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
          break
        }
        default:
          toast.error('Platform not supported')
      }
    } catch (error) {
      console.error('Error initiating connection:', error)
      toast.error('Failed to initiate connection', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        setOpen(open)
        setSearchTerm('')
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[700px] max-w-[700px] h-[680px] max-h-[680px] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Connection</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <Input
            placeholder="Search platforms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-grow overflow-y-auto">
          <div className="grid grid-cols-4 gap-4">
            {filteredPlatforms.length === 0 ? (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                No platforms found
              </div>
            ) : (
              filteredPlatforms.map((platform) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  info={PLATFORM_INFO[platform]}
                  onClick={() => handleConnect(platform)}
                />
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
