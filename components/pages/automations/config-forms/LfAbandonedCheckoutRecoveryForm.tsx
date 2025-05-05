'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { ConnectionSelector } from '@/components/forms/connection-selector';
import { DeviceSelector } from '@/components/forms/device-selector';
import { TemplateSelector } from '@/components/forms/template-selector';
import { Input } from '@/components/ui/input';
import { Platform } from '@prisma/client';
import { LfAbandonedCheckoutRecoveryConfigSchema } from '@/lib/automations/templates/definitions/lf-abandoned-checkout-recovery';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';


type FormValues = z.infer<typeof LfAbandonedCheckoutRecoveryConfigSchema>;

interface LfAbandonedCheckoutRecoveryFormProps {
  form: UseFormReturn<FormValues>;
  templateDefinitionId: string;
}

export const LfAbandonedCheckoutRecoveryForm: React.FC<LfAbandonedCheckoutRecoveryFormProps> = ({ form }) => {
  const t = useTranslations('AutomationTemplates.lf-abandoned-checkout-recovery');
  const tShared = useTranslations('Shared');

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="lightfunnelsConnectionId"
        render={({ field }) => (
          <ConnectionSelector
            form={form}
            name={field.name}
            platformFilter={Platform.LIGHTFUNNELS}
          />
        )}
      />

      <FormField
        control={form.control}
        name="whatsappDeviceId"
        render={({ field }) => (
          <DeviceSelector
            form={form}
            name={field.name}
            label={t('whatsappDeviceLabel')}
            placeholder={t('whatsappDevicePlaceholder')}
          />
        )}
      />

      <FormField
        control={form.control}
        name="messageTemplateId"
        render={({ field }) => (
           <TemplateSelector
             form={form}
             name={field.name}
             label={t('messageTemplateLabel')}
             placeholder={t('messageTemplatePlaceholder')}
           />
        )}
      />
        <Alert variant="default" className="mt-2">
           <Info className="h-4 w-4"/>
           <AlertDescription>
            {t('templateVariableInfo')} {' '}
            <code className="text-xs font-semibold bg-muted px-1 py-0.5 rounded">{'{{recovery_url}}'}</code>, {' '}
            <code className="text-xs font-semibold bg-muted px-1 py-0.5 rounded">{'{{customer_name}}'}</code>.
           </AlertDescription>
        </Alert>


      <FormField
        control={form.control}
        name="delayMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('delayMinutesLabel')}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="5"
                max="1440"
                placeholder={t('delayMinutesPlaceholder')}
                {...field}
                onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
              />
            </FormControl>
            <FormDescription>{t('delayMinutesDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
