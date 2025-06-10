'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { getAutomationTemplateById } from '@/lib/automations/templates/registry';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useTranslations } from 'next-intl';

interface AutomationConfigFormProps {
  templateDefinitionId: string;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => Promise<void> | void;
  isSubmitting: boolean;
  automationId?: string | null;
  disableSubmit?: boolean;
}

export const AutomationConfigForm: React.FC<AutomationConfigFormProps> = ({
  templateDefinitionId,
  form,
  onSubmit,
  isSubmitting,
  automationId, 
  disableSubmit, 
}) => {
  const t = useTranslations('AutomationsPage.create');
  const template = getAutomationTemplateById(templateDefinitionId);

  if (!template) {
    return <div className="text-destructive">{t('errors.templateNotFound')}</div>;
  }

  const SpecificFormComponent = template.ConfigFormComponent;

  const isMultiStepForm = templateDefinitionId === 'gsheets-order-sync' || 
                          templateDefinitionId === 'lf-order-to-whatsapp';

  const shouldShowSubmitButton = !isMultiStepForm && !disableSubmit;

  const formComponentProps: any = {
    form,
    templateDefinitionId,
    automationId,
  };

  if (isMultiStepForm) {
    formComponentProps.onSubmit = onSubmit;
    formComponentProps.isSubmitting = isSubmitting;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('configureTitle', { templateName: template.name })}</CardTitle>
        <CardDescription>{t('configureDescription', { templateDescription: template.description })}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={disableSubmit ? (e) => e.preventDefault() : form.handleSubmit(onSubmit)} className="space-y-6">

            <SpecificFormComponent
                {...formComponentProps}
            />

            {form.formState.errors.root && (
               <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}

            {shouldShowSubmitButton && (
              <div className="flex justify-end">
                 <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting && (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   )}
                   {t('submitButton')}
                 </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
