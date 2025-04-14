'use client';

import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing'; // Use next-intl navigation

import { getAvailableAutomationTemplates, getAutomationTemplateById } from '@/lib/automations/templates/registry';
import { toast } from 'sonner';
import { z } from 'zod'; // Import z
import { createAutomationInstance } from '@/lib/automations/actions/automations';
import { AutomationTemplateCard } from '@/components/pages/automations/automation-template-card';
import { AutomationConfigForm } from '@/components/pages/automations/config-forms/automation-config-form';

export default function CreateAutomationPage() {
  const t = useTranslations('AutomationsPage.create');
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTemplates = useMemo(() => getAvailableAutomationTemplates(), []);
  const selectedTemplate = useMemo(() => selectedTemplateId ? getAutomationTemplateById(selectedTemplateId) : null, [selectedTemplateId]);

  // Initialize form with an empty default values object initially
  const form = useForm<any>({
    resolver: selectedTemplate ? zodResolver(selectedTemplate.configSchema) : undefined,
    defaultValues: selectedTemplate?.defaultConfig ?? {}, // Initialize based on current selection
  });

  // --- This useEffect is crucial for re-initializing the form ---
  // --- when the template changes AFTER the initial render ---
  useEffect(() => {
    if (selectedTemplate) {
      // Ensure all fields in the schema have a default (even if just '')
      // to prevent uncontrolled -> controlled switch after reset
      const defaultValuesWithFallbacks = { ...selectedTemplate.defaultConfig };
      const schemaKeys = Object.keys(selectedTemplate.configSchema.shape);
      schemaKeys.forEach(key => {
          if (defaultValuesWithFallbacks[key] === undefined) {
              // Provide an empty string as a fallback default for controlled inputs
              // Adjust if non-string defaults are needed (e.g., 0 for number, false for boolean)
              defaultValuesWithFallbacks[key] = '';
          }
      });

      form.reset(defaultValuesWithFallbacks);
      // Resetting the form should be enough, react-hook-form often handles
      // resolver updates internally based on the new structure.
      // If resolver issues persist, you might need more complex state management
      // for the resolver itself, but try without first.
    } else {
      form.reset({}); // Reset to empty when deselecting
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]); // Rerun only when the ID changes

  const handleTemplateSelect = (templateId: string) => {
    // Only update if the ID is different to avoid unnecessary rerenders/resets
    if (templateId !== selectedTemplateId) {
         setSelectedTemplateId(templateId);
         // The useEffect above will handle the form reset
    }
  };

  const handleBack = () => {
    setSelectedTemplateId(null);
    // The useEffect above will reset the form
  };

  const onSubmit = async (data: any) => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      const automationName = `${selectedTemplate.name} - ${new Date().toLocaleTimeString()}`;
      const automationData = {
        templateDefinitionId: selectedTemplate.id,
        name: automationName,
        config: data,
        // Extract IDs carefully based on field names in the *specific* template's schema
        connectionId: data[selectedTemplate.configSchema.shape.lightfunnelsConnectionId ? 'lightfunnelsConnectionId' : 'connectionId'] || undefined, // Adjust field name based on schema
        deviceId: data[selectedTemplate.configSchema.shape.whatsappDeviceId ? 'whatsappDeviceId' : 'deviceId'] || undefined,
        templateId: data[selectedTemplate.configSchema.shape.messageTemplateId ? 'messageTemplateId' : 'templateId'] || undefined,
        trigger: selectedTemplate.trigger.prismaTriggerType,
        triggerConfig: { type: selectedTemplate.trigger.type, platform: selectedTemplate.trigger.platform },
        isActive: true,
      };

      console.log("Submitting Automation Data:", automationData); // Debug log

      const result = await createAutomationInstance(automationData);
      toast.success(t('success.title'), { description: t('success.description') });
      router.push('/automations');
    } catch (error: any) {
      console.error("Failed to create automation:", error);
      toast.error(t('errors.submitFailed'), { description: error.message || t('errors.unknown') });
      form.setError('root', { message: error.message || t('errors.unknown') }) // Set root error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 w-full">
      {!selectedTemplate ? (
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
        <div>
           <button onClick={handleBack} className="mb-4 text-sm text-primary hover:underline">
               ← {t('backToTemplates')}
           </button>
          {/* Use the key prop here */}
          <AutomationConfigForm
            key={selectedTemplateId} // Force remount on template change
            templateDefinitionId={selectedTemplate.id}
            form={form}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}
