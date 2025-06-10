'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing'; // Import Link too
import { getAvailableAutomationTemplates, getAutomationTemplateById } from '@/lib/automations/templates/registry';
import { toast } from 'sonner';
import { z } from 'zod';
import { createAutomationInstance } from '@/lib/automations/actions/automations';
import { AutomationTemplateCard } from '@/components/pages/automations/automation-template-card';
import { AutomationConfigForm } from '@/components/pages/automations/config-forms/automation-config-form';
import { Button } from '@/components/ui/button'; // Import Button
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert
import { CheckCircle } from 'lucide-react'; // Import Icon

export default function CreateAutomationPage() {
  const t = useTranslations('AutomationsPage.create');
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAutomationId, setCreatedAutomationId] = useState<string | null>(null);

  const availableTemplates = useMemo(() => getAvailableAutomationTemplates(), []);
  const selectedTemplate = useMemo(() => selectedTemplateId ? getAutomationTemplateById(selectedTemplateId) : null, [selectedTemplateId]);

  const form = useForm<any>({
    resolver: selectedTemplate ? zodResolver(selectedTemplate.configSchema) : undefined,
    defaultValues: {}, 
  });

  useEffect(() => {
    if (selectedTemplate) {
      const defaultValuesWithFallbacks = { ...selectedTemplate.defaultConfig };
      const schemaKeys = Object.keys(selectedTemplate.configSchema.shape);
      schemaKeys.forEach(key => {
        if (defaultValuesWithFallbacks[key] === undefined) {
          defaultValuesWithFallbacks[key] = ''; // Or other appropriate defaults
        }
      });
      form.reset(defaultValuesWithFallbacks);
    } else {
      form.reset({});
    }
  }, [selectedTemplateId]); 

  const handleTemplateSelect = (templateId: string) => {
    if (templateId !== selectedTemplateId) {
      setCreatedAutomationId(null); 
      setSelectedTemplateId(templateId);
    }
  };

  const handleBack = () => {
    setCreatedAutomationId(null); 
    setSelectedTemplateId(null);
  };

  const onSubmit = async (data: any) => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    setCreatedAutomationId(null); 
    try {
      const automationName = `${selectedTemplate.name} - ${new Date().toLocaleTimeString()}`;
      const automationData = {
        templateDefinitionId: selectedTemplate.id,
        name: automationName,
        config: data,
        connectionId: data[Object.keys(data).find(k => k.toLowerCase().includes('connectionid')) as string] || undefined,
        deviceId: data[Object.keys(data).find(k => k.toLowerCase().includes('deviceid')) as string] || undefined,
        templateId: data[Object.keys(data).find(k => k.toLowerCase().includes('templateid')) as string] || undefined,
        trigger: selectedTemplate.trigger.prismaTriggerType,
        triggerConfig: { type: selectedTemplate.trigger.type, platform: selectedTemplate.trigger.platform },
        isActive: true,
      };


      const result = await createAutomationInstance(automationData);
      toast.success(t('success.title'), { description: t('success.description') });

      setCreatedAutomationId(result.id);

    } catch (error: any) {
      console.error("Failed to create automation:", error);
      toast.error(t('errors.submitFailed'), { description: error.message || t('errors.unknown') });
      form.setError('root', { message: error.message || t('errors.unknown') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 w-full">
      {!selectedTemplate ? (
        // --- Template Selection (No changes needed here) ---
        <>
          <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground mb-6">{t('description')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTemplates.length > 0 ? (
              availableTemplates.map((template) => (
                <AutomationTemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleTemplateSelect(template.id)}
                  isSelected={selectedTemplateId === template.id}
                />
              ))
            ) : (
              <p>{t('noTemplates')}</p>
            )}
          </div>
        </>
      ) : (
        // --- Configuration / Success View ---
        <div>
          <button onClick={handleBack} className="mb-4 text-sm text-primary hover:underline">
            ← {t('backToTemplates')}
          </button>

          {/* --- Show Success Message and Script AFTER creation --- */}
          {createdAutomationId && selectedTemplate.trigger.prismaTriggerType === 'SCRIPT_TAG' && (
              <Alert className="mb-6">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>{t('success.title')}</AlertTitle>
                <AlertDescription>
                  {t('success.scriptInstruction')}
                </AlertDescription>
              </Alert>
          )}

          <AutomationConfigForm
            key={selectedTemplateId} // Force remount on template change maybe?
            templateDefinitionId={selectedTemplate.id}
            form={form}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            automationId={createdAutomationId}
            disableSubmit={!!createdAutomationId}
          />

          {createdAutomationId && (
            <div className="mt-6 flex justify-end">
               <Link href="/automations">
                  <Button>{t('finishButton')}</Button>
               </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
