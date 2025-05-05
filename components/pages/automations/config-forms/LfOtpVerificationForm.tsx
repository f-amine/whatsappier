'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { DeviceSelector } from '@/components/forms/device-selector';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button'; 
import { CopyIcon, Info } from 'lucide-react'; 
import { LfOtpVerificationConfigSchema } from '@/lib/automations/templates/definitions/lf-otp-verification';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; 
import { toast } from 'sonner'; 
import { Label } from '@/components/ui/label';

type FormValues = z.infer<typeof LfOtpVerificationConfigSchema>;

interface LfOtpVerificationFormProps {
  form: UseFormReturn<FormValues>;
  templateDefinitionId: string; 
  automationId?: string | null;}

export const LfOtpVerificationForm: React.FC<LfOtpVerificationFormProps> = ({ form, automationId }) => {
  const t = useTranslations('AutomationTemplates.lf-otp-verification');
  const tShared = useTranslations('Shared'); 

  const scriptUrl = automationId ? `/api/scripts/lightfunnels-otp/${automationId}` : null;
  const scriptTag = scriptUrl ? `<script src="${window.location.origin}${scriptUrl}" async defer></script>` : '';

  const handleCopyScript = () => {
    if (!scriptTag) return;
    navigator.clipboard.writeText(scriptTag)
      .then(() => {
        toast.success(tShared('copiedToClipboard'), {
           description: t('copyScriptSuccessDescription'),
        });
      })
      .catch(err => {
        toast.error(tShared('copyFailed'), {
           description: t('copyScriptErrorDescription'),
        });
        console.error('Failed to copy script:', err);
      });
  };


  return (
    <div className="space-y-6"> 
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
        name="messageTemplate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('messageTemplateLabel')}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('messageTemplatePlaceholder')}
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>{t('messageTemplateDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Optional fields can remain if desired */}
      {/*
      <FormField control={form.control} name="otpLength" render={...} />
      <FormField control={form.control} name="otpExpiryMinutes" render={...} />
      */}

      {/* --- Script Display Section --- */}
      {automationId && scriptUrl && (
        <div className="space-y-4 pt-4 border-t">
           <h3 className="text-lg font-semibold">{t('integrationScriptTitle')}</h3>
           <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>{t('importantNoteTitle')}</AlertTitle>
                <AlertDescription>
                  {t('importantNoteDescription')}
                </AlertDescription>
            </Alert>

           <p className="text-sm text-muted-foreground">
                {t('scriptInstruction')}
           </p>

          <div className="space-y-2">
             <Label htmlFor="lf-otp-script">{t('scriptSnippetLabel')}</Label>
             <div className="relative">
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm font-mono">
                  <code id="lf-otp-script">{scriptTag}</code>
                </pre>
                <Button
                  type="button" 
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={handleCopyScript}
                  aria-label={tShared('copy')}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
             </div>
          </div>

           <div>
                <h4 className="font-medium text-sm mb-1">{t('installationStepsTitle')}</h4>
                <ol className="text-sm text-muted-foreground ml-5 list-decimal space-y-1">
                  <li>{t('step1')}</li>
                  <li>{t('step2')}</li>
                  <li>{t('step3')}</li>
                  <li>{t('step4')}</li>
                  <li>{t('step5')}</li>
                </ol>
              </div>

        </div>
      )}
      {!automationId && (
           <Alert variant="default">
               <Info className="h-4 w-4" />
               <AlertTitle>{t('saveToGetScriptTitle')}</AlertTitle>
               <AlertDescription>
                 {t('saveToGetScriptDescription')}
               </AlertDescription>
           </Alert>
      )}
    </div>
  );
};
