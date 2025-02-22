"use client"

import { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "@tanstack/react-query"
import { TriggerType } from "@prisma/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createAutomation } from '@/lib/mutations/automations'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/shared/icons'
import { Flower2 } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  connectionId: z.string().min(1, { message: "Connection is required" }),
  templateId: z.string().min(1, { message: "Template is required" }),
  deviceId: z.string().min(1, { message: "Device is required" }),
  trigger: z.nativeEnum(TriggerType),
  triggerConfig: z.record(z.any()),
})

type FormData = z.infer<typeof formSchema>

interface CreateAutomationDialogProps {
  children: React.ReactNode
  onRefresh?: () => void
}

export function CreateAutomationDialog({
  children,
  onRefresh,
}: CreateAutomationDialogProps) {
  const t = useTranslations('AutomationsPage')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>(TriggerType.WEBHOOK)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerConfig: {},
      trigger: TriggerType.WEBHOOK
    },
  })

  // Fetch available connections, templates, and devices
  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      // This would normally fetch from your API
      return []
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      // This would normally fetch from your API
      return []
    },
  })

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      // This would normally fetch from your API
      return []
    },
  })

  const createMutation = useMutation({
    mutationFn: createAutomation,
    onSuccess: () => {
      toast.success(t('automation_created'))
      setIsOpen(false)
      form.reset()
      onRefresh?.()
    },
    onError: (error) => {
      toast.error(t('error_creating'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync(data)
    } catch (error) {
      console.error('Error creating automation:', error)
    }
  }

  const handleTriggerSelect = (type: TriggerType) => {
    setSelectedTrigger(type)
    form.setValue('trigger', type)
    // Reset trigger config when changing types
    form.setValue('triggerConfig', {})
  }

  const renderTriggerConfig = () => {
    switch (selectedTrigger) {
      case TriggerType.WEBHOOK:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('webhook_endpoint')}</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('webhook_endpoint_description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )
      case TriggerType.SCHEDULE:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.cron"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cron_expression')}</FormLabel>
                  <FormControl>
                    <Input placeholder="* * * * *" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('cron_description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )
      case TriggerType.EVENT:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('event_type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_event_type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="order.created">Order Created</SelectItem>
                      <SelectItem value="order.updated">Order Updated</SelectItem>
                      <SelectItem value="customer.created">Customer Created</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )
      case TriggerType.API:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('api_key')}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('api_key_description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('create_automation')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('automation_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="connectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('connection')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_connection')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {connections.map((connection: any) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('template')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_template')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template: any) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('device')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_device')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {devices.map((device: any) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormLabel>{t('trigger_type')}</FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.values(TriggerType).map((type) => (
                  <Card 
                    key={type}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTrigger === type ? 'border-primary' : ''
                    }`}
                    onClick={() => handleTriggerSelect(type)}
                  >
                    <CardHeader className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Flower2 className="h-6 w-6" />
                        <CardTitle className="text-sm">{type}</CardTitle>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <div className="mt-4">
                {renderTriggerConfig()}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
