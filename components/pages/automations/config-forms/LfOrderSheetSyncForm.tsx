'use client';

import React, { useState, useEffect } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { GsheetsOrderSyncConfigSchema } from '@/lib/automations/templates/definitions/gsheets-order-sync';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { ConnectionSelector } from '@/components/forms/connection-selector';
import { FunnelSelector } from '@/components/forms/funnel-selector';
import { ProductSelector } from '@/components/forms/product-selector';
import { SheetSelector } from '@/components/forms/sheets-selector';
import { WorksheetSelector } from '@/components/forms/worksheet-selector';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Platform } from '@prisma/client';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ORDER_SHEET_COLUMNS, convertColumnsToFormValues, getColumnDisplayName } from '@/lib/automations/helpers/sheets-columns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FormValues = z.infer<typeof GsheetsOrderSyncConfigSchema>;

interface GsheetsOrderSyncFormProps {
  form: UseFormReturn<FormValues>;
  templateDefinitionId: string;
  onSubmit?: (data: any) => Promise<void> | void; // Add onSubmit prop
  isSubmitting?: boolean; // Add isSubmitting prop
}

export const GsheetsOrderSyncForm: React.FC<GsheetsOrderSyncFormProps> = ({ 
  form, 
  templateDefinitionId, 
  onSubmit, 
  isSubmitting = false 
}) => {
  const t = useTranslations('AutomationTemplates.gsheets-order-sync');
  const tSelectors = useTranslations('Selectors');
  
  const [activeTab, setActiveTab] = useState("lightfunnels");
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!onSubmit) return;
    
    console.log('Form submission triggered');
    console.log('Form values:', form.getValues());
    console.log('Form errors:', form.formState.errors);
    
    // Manual validation for conditional fields
    const formValues = form.getValues();
    let hasErrors = false;
    
    // Check if funnel is required and missing
    if (formValues.syncSource === 'specific_funnel' && !formValues.funnelId) {
      form.setError('funnelId', { message: 'Funnel selection is required for specific funnel sync' });
      hasErrors = true;
    }
    
    // Check if product is required and missing
    if (formValues.productFilter === 'specific_product' && !formValues.productId) {
      form.setError('productId', { message: 'Product selection is required for specific product filter' });
      hasErrors = true;
    }
    
    // Validate the form
    const isValid = await form.trigger();
    console.log('Form validation result:', isValid);
    
    if (isValid && !hasErrors) {
      const formData = form.getValues();
      console.log('Calling onSubmit with:', formData);
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Submission error:', error);
      }
    } else {
      console.error('Form validation failed:', form.formState.errors);
      // Switch to the first tab with errors
      if (form.formState.errors.lightfunnelsConnectionId) {
        setActiveTab("lightfunnels");
      } else if (form.formState.errors.funnelId) {
        setActiveTab("source");
      } else if (form.formState.errors.productId) {
        setActiveTab("filters");
      } else if (form.formState.errors.googleSheetsConnectionId) {
        setActiveTab("googlesheets");
      } else if (form.formState.errors.googleSheetId) {
        setActiveTab("spreadsheet");
      } else if (form.formState.errors.worksheetName) {
        setActiveTab("worksheet");
      }
    }
  };
  const t = useTranslations('AutomationTemplates.gsheets-order-sync');
  const tSelectors = useTranslations('Selectors');
  
  const [activeTab, setActiveTab] = useState("lightfunnels");
  
  // Ensure all sheetColumns have default values
  React.useEffect(() => {
    const currentSheetColumns = form.getValues('sheetColumns');
    if (!currentSheetColumns || !Array.isArray(currentSheetColumns)) {
      form.setValue('sheetColumns', convertColumnsToFormValues(ORDER_SHEET_COLUMNS));
    } else {
      // Ensure all enabled fields are booleans
      const fixedColumns = currentSheetColumns.map(col => ({
        ...col,
        enabled: typeof col.enabled === 'boolean' ? col.enabled : col.enabled === 'true' || col.enabled === true
      }));
      form.setValue('sheetColumns', fixedColumns);
    }
    
    if (form.getValues('syncSource') === undefined) {
      form.setValue('syncSource', 'all_sources');
    }
    
    if (form.getValues('productFilter') === undefined) {
      form.setValue('productFilter', 'all_products');
    }
    
    if (form.getValues('syncMode') === undefined) {
      form.setValue('syncMode', 'append_only');
    }
    
    // Fix boolean fields - ensure they are actual booleans
    const createNewSheet = form.getValues('createNewSheet');
    if (createNewSheet === undefined || typeof createNewSheet !== 'boolean') {
      form.setValue('createNewSheet', false);
    }
  }, [form]);
  
  // Clear conditional errors when selections change
  useEffect(() => {
    if (syncSource !== 'specific_funnel') {
      form.clearErrors('funnelId');
    }
  }, [syncSource, form]);
  
  useEffect(() => {
    if (productFilter !== 'specific_product') {
      form.clearErrors('productId');
    }
  }, [productFilter, form]);
  
  const selectedLfConnectionId = useWatch({
    control: form.control,
    name: "lightfunnelsConnectionId",
  });
  
  const selectedGsConnectionId = useWatch({
    control: form.control,
    name: "googleSheetsConnectionId",
  });
  
  const syncSource = useWatch({
    control: form.control,
    name: "syncSource",
    defaultValue: 'all_sources'
  });
  
  const productFilter = useWatch({
    control: form.control,
    name: "productFilter",
    defaultValue: 'all_products'
  });
  
  const selectedFunnelId = useWatch({
    control: form.control,
    name: "funnelId",
  });
  
  const selectedProductId = useWatch({
    control: form.control,
    name: "productId",
  });
  
  const selectedGoogleSheetId = useWatch({
    control: form.control,
    name: "googleSheetId",
  });
  
  const selectedWorksheetName = useWatch({
    control: form.control,
    name: "worksheetName",
  });
  
  // Handle next tab navigation
  const goToNextTab = () => {
    if (activeTab === "lightfunnels" && selectedLfConnectionId) {
      setActiveTab("source");
    } else if (activeTab === "source") {
      // Check if required fields are filled based on selection
      const canProceed = 
        syncSource === 'all_sources' || 
        (syncSource === 'specific_funnel' && selectedFunnelId) ||
        (syncSource === 'specific_store'); // Store ID validation can be added later
      
      if (canProceed) {
        setActiveTab("filters");
      }
    } else if (activeTab === "filters") {
      const canProceed = 
        productFilter === 'all_products' || 
        (productFilter === 'specific_product' && selectedProductId);
      
      if (canProceed) {
        setActiveTab("googlesheets");
      }
    } else if (activeTab === "googlesheets" && selectedGsConnectionId) {
      setActiveTab("spreadsheet");
    } else if (activeTab === "spreadsheet" && selectedGoogleSheetId) {
      setActiveTab("worksheet");
    } else if (activeTab === "worksheet" && selectedWorksheetName) {
      setActiveTab("columns");
    }
  const goToPrevTab = () => {
  
  // Handle previous tab navigation
  // Handle form submission
  const handleSubmit = async () => {
    if (!onSubmit) return;
    
    console.log('Form submission triggered');
    console.log('Form values:', form.getValues());
    console.log('Form errors:', form.formState.errors);
    
    // Validate the form
    const isValid = await form.trigger();
    console.log('Form validation result:', isValid);
    
    if (isValid) {
      const formData = form.getValues();
      console.log('Calling onSubmit with:', formData);
      await onSubmit(formData);
    } else {
      console.error('Form validation failed:', form.formState.errors);
    }
  };
    if (activeTab === "source") {
      setActiveTab("lightfunnels");
    } else if (activeTab === "filters") {
      setActiveTab("source");
    } else if (activeTab === "googlesheets") {
      setActiveTab("filters");
    } else if (activeTab === "spreadsheet") {
      setActiveTab("googlesheets");
    } else if (activeTab === "worksheet") {
      setActiveTab("spreadsheet");
    } else if (activeTab === "columns") {
      setActiveTab("worksheet");
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug info - remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 bg-gray-100 rounded text-xs">
          <p><strong>Current Tab:</strong> {activeTab}</p>
          <p><strong>LF Connection:</strong> {selectedLfConnectionId || 'None'}</p>
          <p><strong>GS Connection:</strong> {selectedGsConnectionId || 'None'}</p>
          <p><strong>Sheet ID:</strong> {selectedGoogleSheetId || 'None'}</p>
          <p><strong>Worksheet:</strong> {selectedWorksheetName || 'None'}</p>
          <p><strong>Sync Source:</strong> {syncSource}</p>
          <p><strong>Product Filter:</strong> {productFilter}</p>
          <p><strong>Form Valid:</strong> {form.formState.isValid ? 'Yes' : 'No'}</p>
          <p><strong>Form Errors:</strong> {Object.keys(form.formState.errors).length}</p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        {/* Lightfunnels Connection Tab */}
        <TabsContent value="lightfunnels" className="space-y-4">
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
              disabled={!selectedLfConnectionId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Source Selection Tab */}
        <TabsContent value="source" className="space-y-4">
          <FormField
            control={form.control}
            name="syncSource"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('syncSource')}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all_sources" id="all_sources" />
                      <Label htmlFor="all_sources">{t('allSources')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="specific_funnel" id="specific_funnel" />
                      <Label htmlFor="specific_funnel">{t('specificFunnel')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="specific_store" id="specific_store" />
                      <Label htmlFor="specific_store">{t('specificStore')}</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {syncSource === 'specific_funnel' && (
            <FormField
              control={form.control}
              name="funnelId"
              render={({ field }) => (
                <FunnelSelector
                  form={form}
                  name={field.name}
                  connectionId={selectedLfConnectionId}
                  placeholder={tSelectors('selectFunnel')}
                />
              )}
            />
          )}
          
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
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-4">
          <FormField
            control={form.control}
            name="productFilter"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('productFilter')}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all_products" id="all_products" />
                      <Label htmlFor="all_products">{t('allProducts')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="specific_product" id="specific_product" />
                      <Label htmlFor="specific_product">{t('specificProduct')}</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {productFilter === 'specific_product' && (
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <ProductSelector
                  form={form}
                  name={field.name}
                  connectionId={selectedLfConnectionId}
                  placeholder={tSelectors('selectProduct')}
                />
              )}
            />
          )}
          
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
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Google Sheets Connection Tab */}
        <TabsContent value="googlesheets" className="space-y-4">
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
              disabled={!selectedGsConnectionId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Spreadsheet Selection Tab */}
        <TabsContent value="spreadsheet" className="space-y-4">
          <FormField
            control={form.control}
            name="googleSheetId"
            render={({ field }) => (
              <SheetSelector
                form={form}
                name={field.name}
                connectionId={selectedGsConnectionId}
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
              disabled={!selectedGoogleSheetId}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Worksheet Selection Tab */}
        <TabsContent value="worksheet" className="space-y-4">
          <FormField
            control={form.control}
            name="worksheetName"
            render={({ field }) => (
              <WorksheetSelector
                form={form}
                name={field.name}
                connectionId={selectedGsConnectionId}
                spreadsheetId={selectedGoogleSheetId}
                label={t('worksheet')}
                placeholder={t('selectWorksheet')}
              />
            )}
          />
          
          <FormField
            control={form.control}
            name="syncMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('syncMode')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectSyncMode')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="append_only">{t('appendOnly')}</SelectItem>
                    <SelectItem value="update_existing">{t('updateExisting')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('syncModeDescription')}
                </FormDescription>
                <FormMessage />
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
            <Button 
              type="button" 
              onClick={goToNextTab}
              disabled={!selectedWorksheetName}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        {/* Column Mapping Tab */}
        <TabsContent value="columns" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">{t('columnMapping')}</h3>
              <p className="text-sm text-muted-foreground">{t('columnMappingDescription')}</p>
            </div>
            
            {/* Column Selection Grid */}
            <div className="border rounded-md p-4">
              <FormLabel className="mb-4 block text-base font-medium">{t('selectColumns')}</FormLabel>
              <FormDescription className="mb-4">
                {t('selectColumnsDescription')}
              </FormDescription>
              
              {(() => {
                const sheetColumns = form.watch('sheetColumns') || [];
                const categories = [...new Set(sheetColumns.map(col => col.category))];
                
                return categories.map(category => (
                  <div key={category} className="mb-6">
                    <h4 className="text-sm font-semibold mb-3 pb-2 border-b text-foreground">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {sheetColumns
                        .filter(column => column.category === category)
                        .map((column, columnIndex) => {
                          const index = sheetColumns.findIndex(col => col.field === column.field);
                          
                          return (
                            <FormField
                              key={column.field}
                              control={form.control}
                              name={`sheetColumns.${index}.enabled`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary focus:ring-2"
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm leading-5">
                                    {getColumnDisplayName(column.field)}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          );
                        })}
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            {/* Advanced Settings */}
            <div className="border rounded-md p-4 space-y-4">
              <h4 className="text-sm font-semibold">{t('advancedSettings')}</h4>
              
              {form.watch('syncMode') === 'update_existing' && (
                <FormField
                  control={form.control}
                  name="uniqueIdentifierField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('uniqueIdentifier')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectUniqueField')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch('sheetColumns')
                            ?.filter(col => col.enabled)
                            ?.map(column => (
                              <SelectItem key={column.field} value={column.field}>
                                {getColumnDisplayName(column.field)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t('uniqueIdentifierDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
          
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
            
            {/* Submit button on the last step */}
            <Button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('createAutomation')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
