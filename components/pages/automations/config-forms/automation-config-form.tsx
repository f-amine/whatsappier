// /whatsappier/components/automations/config-forms/AutomationConfigForm.tsx
'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { getAutomationTemplateById } from '@/lib/automations/templates/registry'; // Adjust path
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button
import { Form } from '@/components/ui/form'; // ***** IMPORT Form *****
import { useTranslations } from 'next-intl';

interface AutomationConfigFormProps {
  templateDefinitionId: string;
  form: UseFormReturn<any>; // Use 'any' for simplicity, or create a generic type
  onSubmit: (data: any) => Promise<void> | void; // Allow sync or async onSubmit
  isSubmitting: boolean;
}

export const AutomationConfigForm: React.FC<AutomationConfigFormProps> = ({
  templateDefinitionId,
  form,
  onSubmit,
  isSubmitting,
}) => {
  const t = useTranslations('AutomationsPage.create');
  const template = getAutomationTemplateById(templateDefinitionId);

  if (!template) {
    return <div className="text-destructive">{t('errors.templateNotFound')}</div>;
  }

  const SpecificFormComponent = template.ConfigFormComponent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('configureTitle', { templateName: template.name })}</CardTitle>
        <CardDescription>{t('configureDescription', { templateDescription: template.description })}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* ***** WRAP with Form component ***** */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Render the specific form component */}
            {/* This now correctly exists within the Form context */}
            <SpecificFormComponent form={form} templateDefinitionId={templateDefinitionId} />

            {/* Display general form errors if any */}
            {form.formState.errors.root && (
               <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}

            <div className="flex justify-end">
               {/* Use Shadcn Button */}
               <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting && (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 )}
                 {t('submitButton')}
               </Button>
            </div>
          </form>
        </Form> {/* ***** END Form wrapper ***** */}
      </CardContent>
    </Card>
  );
};
