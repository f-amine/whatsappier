// File: /whatsappier/components/pages/automations/config-forms/LfOrderToWhatsappForm.tsx
'use client';

import React, { useState } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { LfOrderToWhatsappConfigSchema } from '@/lib/automations/templates/definitions/lf-order-to-whatsapp';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { ConnectionSelector } from '@/components/forms/connection-selector';
import { DeviceSelector } from '@/components/forms/device-selector';
import { TemplateSelector } from '@/components/forms/template-selector';
import { FunnelSelector } from '@/components/forms/funnel-selector';
import { SheetSelector } from '@/components/forms/sheets-selector';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Platform } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Database, Link2, MessageSquare, ShoppingCart, Smartphone, Table } from 'lucide-react';

type FormValues = z.infer<typeof LfOrderToWhatsappConfigSchema>;

interface LfOrderToWhatsappFormProps {
  form: UseFormReturn<FormValues>;
  templateDefinitionId: string;
}

export const LfOrderToWhatsappForm: React.FC<LfOrderToWhatsappFormProps> = ({ form, templateDefinitionId }) => {
  const t = useTranslations('AutomationTemplates.lf-order-to-whatsapp');
  const tSelectors = useTranslations('Selectors');
  
  // Create state for active tab
  const [activeTab, setActiveTab] = useState("connection");
  
  // Ensure sheetColumns have default values to prevent TypeError
  React.useEffect(() => {
    // Initialize default column configuration if not already set
    if (!form.getValues('sheetColumns')) {
      form.setValue('sheetColumns', [
        { field: 'date', enabled: true },
        { field: 'orderNumber', enabled: true },
        { field: 'customerName', enabled: true },
        { field: 'customerEmail', enabled: true },
        { field: 'customerPhone', enabled: true },
        { field: 'totalAmount', enabled: true },
        { field: 'status', enabled: true },
        { field: 'replyText', enabled: true }
      ]);
    }
  }, [form]);
  
  const selectedConnectionId = useWatch({
      control: form.control,
      name: "lightfunnelsConnectionId",
  });
  
  const selectedFunnelId = useWatch({
      control: form.control,
      name: "funnelId",
  });
  
  const selectedDeviceId = useWatch({
      control: form.control,
      name: "whatsappDeviceId",
  });
  
  const selectedTemplateId = useWatch({
      control: form.control,
      name: "messageTemplateId",
  });
  
  const requireConfirmation = useWatch({
      control: form.control,
      name: "requireConfirmation",
      defaultValue: true
  });
  
  const syncToGoogleSheets = useWatch({
      control: form.control,
      name: "syncToGoogleSheets",
      defaultValue: false
  });
  
  const selectedGoogleSheetsConnectionId = useWatch({
      control: form.control,
      name: "googleSheetsConnectionId"
  });
  
  const selectedGoogleSheetId = useWatch({
      control: form.control,
      name: "googleSheetId"
  });
  
  // Handle next tab navigation
  const goToNextTab = () => {
    if (activeTab === "connection" && selectedConnectionId) {
      setActiveTab("funnel");
    } else if (activeTab === "funnel" && selectedFunnelId) {
      setActiveTab("device");
    } else if (activeTab === "device" && selectedDeviceId) {
      setActiveTab("template");
    } else if (activeTab === "template" && selectedTemplateId) {
      setActiveTab("config");
    } else if (activeTab === "config" && syncToGoogleSheets) {
      setActiveTab("googleSheetsConnection");
    } else if (activeTab === "googleSheetsConnection" && selectedGoogleSheetsConnectionId) {
      setActiveTab("googleSheet");
    }
  };
  
  // Handle previous tab navigation
  const goToPrevTab = () => {
    if (activeTab === "funnel") {
      setActiveTab("connection");
    } else if (activeTab === "device") {
      setActiveTab("funnel");
    } else if (activeTab === "template") {
      setActiveTab("device");
    } else if (activeTab === "config") {
      setActiveTab("template");
    } else if (activeTab === "googleSheetsConnection") {
      setActiveTab("config");
    } else if (activeTab === "googleSheet") {
      setActiveTab("googleSheetsConnection");
    }
  };

  // Determine which tabs to show
  const showGoogleSheetsTabs = syncToGoogleSheets;
  const tabCount = showGoogleSheetsTabs ? 7 : 5;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Connection Selection Tab */}
        <TabsContent value="connection" className="space-y-4">
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
          <div className="flex justify-end mt-6">
            <Button 
              type="button" 
              onClick={goToNextTab}
              disabled={!selectedConnectionId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Funnel Selection Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <FormField
            control={form.control}
            name="funnelId"
            render={({ field }) => (
              <FunnelSelector
                form={form}
                name={field.name}
                connectionId={selectedConnectionId}
                placeholder={tSelectors('selectFunnel')}
              />
            )}
          />
          <div className="flex justify-between mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={goToPrevTab}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            <Button 
              type="button" 
              onClick={goToNextTab}
              disabled={!selectedFunnelId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Device Selection Tab */}
        <TabsContent value="device" className="space-y-4">
          <FormField
            control={form.control}
            name="whatsappDeviceId"
            render={({ field }) => (
                <DeviceSelector
                    form={form}
                    name={field.name}
                />
            )}
          />
          <div className="flex justify-between mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={goToPrevTab}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            <Button 
              type="button" 
              onClick={goToNextTab}
              disabled={!selectedDeviceId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Template Selection Tab */}
        <TabsContent value="template" className="space-y-4">
          <FormField
            control={form.control}
            name="messageTemplateId"
            render={({ field }) => (
                <TemplateSelector
                    form={form}
                    name={field.name}
                />
            )}
          />
          <div className="flex justify-between mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={goToPrevTab}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            <Button 
              type="button" 
              onClick={goToNextTab}
              disabled={!selectedTemplateId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <FormField
            control={form.control}
            name="requireConfirmation"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t('requireConfirmation')}
                  </FormLabel>
                  <FormDescription>
                    {t('requireConfirmationDescription')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="syncToGoogleSheets"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t('syncToGoogleSheets')}
                  </FormLabel>
                  <FormDescription>
                    {t('syncToGoogleSheetsDescription')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!checked) {
                        // Clear Google Sheets related fields if disabled
                        form.setValue("googleSheetsConnectionId", undefined);
                        form.setValue("googleSheetId", undefined);
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <div className="flex justify-between mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={goToPrevTab}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            {syncToGoogleSheets && (
              <Button 
                type="button" 
                onClick={goToNextTab}
                className="flex items-center gap-2"
              >
                {t('next')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TabsContent>
        
        {/* Google Sheets Connection Tab */}
        <TabsContent value="googleSheetsConnection" className="space-y-4">
          <FormField
            control={form.control}
            name="googleSheetsConnectionId"
            render={({ field }) => (
              <ConnectionSelector
                form={form}
                name={field.name}
                platformFilter={Platform.GOOGLE_SHEETS}
              />
            )}
          />
          <div className="flex justify-between mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={goToPrevTab}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            <Button 
              type="button" 
              onClick={goToNextTab}
              disabled={!selectedGoogleSheetsConnectionId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Google Sheet Selection Tab */}
        <TabsContent value="googleSheet" className="space-y-4">
          <div className="p-4 border rounded-md mb-4">
            <FormField
              control={form.control}
              name="createNewSheet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Create New Sheet</FormLabel>
                    <FormDescription>
                      Create a new Google Sheet or use an existing one
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          
          {form.watch('createNewSheet') ? (
            <FormField
              control={form.control}
              name="customSheetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sheet Name</FormLabel>
                  <FormControl>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter sheet name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="googleSheetId"
              render={({ field }) => (
                <SheetSelector
                  form={form}
                  name={field.name}
                  connectionId={selectedGoogleSheetsConnectionId}
                />
              )}
            />
          )}
          
          <div className="mt-6 p-4 border rounded-md">
            <FormLabel className="mb-2 block">Select Columns to Include</FormLabel>
            <FormDescription className="mb-4">
              Choose which data fields to include in your Google Sheet
            </FormDescription>
            
            {Array.isArray(form.watch('sheetColumns')) && form.watch('sheetColumns').map((column, index) => (
              <FormField
                key={column.field}
                control={form.control}
                name={`sheetColumns.${index}.enabled`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {column.field === 'date' && 'Date'}
                      {column.field === 'orderNumber' && 'Order Number'}
                      {column.field === 'customerName' && 'Customer Name'}
                      {column.field === 'customerEmail' && 'Customer Email'}
                      {column.field === 'customerPhone' && 'Customer Phone'}
                      {column.field === 'totalAmount' && 'Total Amount'}
                      {column.field === 'status' && 'Order Status'}
                      {column.field === 'replyText' && 'Customer Reply Text'}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
          
          <div className="flex justify-start mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={goToPrevTab}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
