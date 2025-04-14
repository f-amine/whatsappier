'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LfOrderToWhatsappConfigSchema } from '@/lib/automations/templates/definitions/lf-order-to-whatsapp'; // Adjust path
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ConnectionSelector } from '@/components/forms/connection-selector'; // Existing component
import { DeviceSelector } from '@/components/forms/device-selector'; // Existing component
import { TemplateSelector } from '@/components/forms/template-selector'; // Existing component
import { Input } from '@/components/ui/input'; // Assuming Input is needed for funnel ID
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Platform } from '@prisma/client'; // Import Platform

// Type for the specific form values derived from the schema
type FormValues = z.infer<typeof LfOrderToWhatsappConfigSchema>;

interface LfOrderToWhatsappFormProps {
  form: UseFormReturn<FormValues>;
  templateDefinitionId: string; // Keep this prop if needed elsewhere
}

export const LfOrderToWhatsappForm: React.FC<LfOrderToWhatsappFormProps> = ({ form }) => {
  const t = useTranslations('AutomationTemplates.lf-order-to-whatsapp'); // Specific translations

  return (
    <div className="space-y-4">
      {/* Lightfunnels Connection Selector */}
      <FormField
        control={form.control}
        name="lightfunnelsConnectionId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('config.lightfunnelsConnectionId.label')}</FormLabel>
            <FormControl>
              {/* Pass the platform filter to ConnectionSelector */}
              <ConnectionSelector
                form={form}
                name={field.name}
                platformFilter={Platform.LIGHTFUNNELS} // Filter for LF connections
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Specific Funnel ID Input (Example) */}
      {/* You might need a FunnelSelector component later */}
      <FormField
        control={form.control}
        name="funnelId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('config.funnelId.label')}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={t('config.funnelId.placeholder')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* WhatsApp Device Selector */}
      <FormField
        control={form.control}
        name="whatsappDeviceId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('config.whatsappDeviceId.label')}</FormLabel>
            <FormControl>
              <DeviceSelector form={form} name={field.name} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Message Template Selector */}
      <FormField
        control={form.control}
        name="messageTemplateId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('config.messageTemplateId.label')}</FormLabel>
            <FormControl>
              <TemplateSelector form={form} name={field.name} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
