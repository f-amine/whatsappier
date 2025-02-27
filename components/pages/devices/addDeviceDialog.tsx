'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { checkConnectionStatus, createWhatsappInstance, WhatsappInstanceData } from '@/lib/mutations/devices'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { set } from 'date-fns'



interface WhatsappConnectionDialogProps {
  children: React.ReactNode
  onRefresh?: () => void
}

export function CreateDeviceDialog({
  children,
  onRefresh,
}: WhatsappConnectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [integrationType, setIntegrationType] = useState<'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'>('WHATSAPP-BAILEYS')
  const [instanceName, setInstanceName] = useState('')
  const [qrData, setQrData] = useState<{base64?: string, code?: string, pairingCode?: string}>()

  const [formData, setFormData] = useState<WhatsappInstanceData>({
    instanceName: '',
    number: '',
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS'
  })


  const createWhatsappMutation = useMutation({
    mutationFn: (whatsappInstanceData: WhatsappInstanceData) =>
      createWhatsappInstance(whatsappInstanceData),
    onSuccess: (response) => {
      setInstanceName(response.instance.instanceName);
      if (response.qrcode) {
        setQrData({
          base64: response.qrcode.base64,
          code: response.qrcode.code,
          pairingCode: response.qrcode.pairingCode,
        });
      }
      setCurrentStep(2);
    },
    onError: () => {
      toast.error(('Error'),{
        description: 'Failed to create WhatsApp instance',
      });
    },
  });

  const handleIntegrationTypeChange = (value: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS') => {
    setIntegrationType(value)
    setFormData(prev => ({
      ...prev,
      integration: value,
      qrcode: value === 'WHATSAPP-BAILEYS',
      token: value === 'WHATSAPP-BUSINESS' ? '' : undefined,
      businessId: value === 'WHATSAPP-BUSINESS' ? '' : undefined,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createWhatsappMutation.mutate(formData)
  }

  const checkStatus = async () => {
    try {
      const response = await checkConnectionStatus(instanceName)
      console.log(response)
      if (response.status === 'CONNECTED') {
        onRefresh?.()
        setOpen(false)
        setCurrentStep(1)
      } else {
        toast.info(('Not Connected'),{
          description: 'Please scan the QR code to connect your WhatsApp instance',
        })
      }
    } catch (error) {
      toast.error(('Error'),{
        description: 'Failed to check connection status',
      })
    }
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Integration Type</Label>
              <RadioGroup
                defaultValue="WHATSAPP-BAILEYS"
                value={integrationType}
                onValueChange={handleIntegrationTypeChange}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="WHATSAPP-BAILEYS" id="evolution" />
                  <Label htmlFor="evolution">Whatsappier</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="WHATSAPP-BUSINESS" id="business" />
                  <Label htmlFor="business">WhatsApp Business</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceName">Instance Name</Label>
              <Input
                id="instanceName"
                required
                value={formData.instanceName}
                onChange={(e) =>
                  setFormData({ ...formData, instanceName: e.target.value })
                }
                placeholder="Enter instance name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">
                {integrationType === 'WHATSAPP-BAILEYS'
                  ? 'Phone Number with Country Code'
                  : 'WhatsApp Number ID'}
              </Label>
              <Input
                id="number"
                required
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
                placeholder={integrationType === 'WHATSAPP-BAILEYS'
                  ? 'e.g., 559999999999'
                  : 'Enter WhatsApp Number ID'}
              />
            </div>

            {integrationType === 'WHATSAPP-BUSINESS' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="token">Permanent Token</Label>
                  <Input
                    id="token"
                    required
                    value={formData.token || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, token: e.target.value })
                    }
                    placeholder="Enter BM Admin User permanent token"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessId">Business ID</Label>
                  <Input
                    id="businessId"
                    required
                    value={formData.businessId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, businessId: e.target.value })
                    }
                    placeholder="Enter WhatsApp Business ID"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createWhatsappMutation.isPending}>
                {createWhatsappMutation.isPending ? <Loader2 className="animate-spin" /> : 'Create Instance'}
              </Button>
            </div>
          </form>
        )

      case 2:
        return (
          <div className="space-y-4">
            {integrationType === 'WHATSAPP-BAILEYS' ? (
              <>
                <p className="text-sm text-gray-600">
                  Scan this QR code with your WhatsApp app to connect
                </p>
                {qrData?.base64 && (
                  <div className="flex justify-center">
                    <img src={qrData.base64} alt="WhatsApp QR Code" className="w-64 h-64" />
                  </div>
                )}
                {qrData?.pairingCode && (
                  <div className="space-y-2">
                    <Label>Pairing Code</Label>
                    <div className="font-mono text-center text-lg">{qrData.pairingCode}</div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">
                WhatsApp Business instance created successfully
              </p>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={checkStatus}>
                Done
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 1 && 'Create WhatsApp Instance'}
            {currentStep === 2 && 'Connect WhatsApp'}
          </DialogTitle>
        </DialogHeader>
        {getStepContent()}
      </DialogContent>
    </Dialog>
  )
}

