'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Platform } from '@prisma/client'
import { toast } from 'sonner'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { platformRegistry } from '@/components/platforms/platforms'

interface CreateConnectionDialogProps {
  children: React.ReactNode
  onRefresh?: () => void
}

export function CreateConnectionDialog({
  children,
  onRefresh,
}: CreateConnectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)

  const handlePlatformSelect = async (platform: Platform) => {
    const config = platformRegistry[platform]
    
    if (!config.component) {
      // If no component, directly call the connect handler
      try {
        await config.connectHandler({
          onSuccess: handleSuccess,
          onError: handleError,
          onCancel: () => setSelectedPlatform(null)
        })
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Connection failed'))
      }
    } else {
      setSelectedPlatform(platform)
    }
  }

  const handleSuccess = () => {
    setIsOpen(false)
    setSelectedPlatform(null)
    onRefresh?.()
    toast.success("Connection created successfully")
  }

  const handleError = (error: Error) => {
    toast.error("Failed to create connection", {
      description: error.message
    })
  }

  const handleCancel = () => {
    setSelectedPlatform(null)
  }

  const PlatformSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.values(platformRegistry).map((config) => (
        <Card 
          key={config.platform}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            "border-2 hover:border-primary"
          )}
          onClick={() => handlePlatformSelect(config.platform)}
        >
          <CardHeader className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative h-12 w-12">
                <Image
                  src={config.info.logo}
                  alt={config.info.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <CardTitle>{config.info.name}</CardTitle>
                <CardDescription>{config.info.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )

  const renderContent = () => {
    if (!selectedPlatform) {
      return <PlatformSelector />
    }

    const config = platformRegistry[selectedPlatform]
    const PlatformComponent = config.component
    
    if (!PlatformComponent) {
      return <PlatformSelector />
    }
    
    return (
      <PlatformComponent 
        onSuccess={handleSuccess} 
        onError={handleError}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {selectedPlatform 
              ? `Connect to ${platformRegistry[selectedPlatform].info.name}`
              : "Select Platform"}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
