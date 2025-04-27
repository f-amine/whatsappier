'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { UseFormReturn } from 'react-hook-form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGoogleSheets } from '@/lib/data/google-sheets';
import { GoogleSheetInfo } from '@/lib/automations/helpers/google-sheets';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SheetSelectorProps {
  form: UseFormReturn<any>;
  name: string;
  connectionId?: string;
  label?: string;
  placeholder?: string;
}

export function SheetSelector({
  form,
  name,
  connectionId,
  label,
  placeholder
}: SheetSelectorProps) {
  const t = useTranslations('Selectors');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['googleSheets', connectionId, debouncedSearch],
    queryFn: async () => {
      if (!connectionId) return { data: [] };
      const response = await getGoogleSheets(connectionId, { 
        search: debouncedSearch,
        limit: 20 
      });
      return response;
    },
    enabled: !!connectionId,
    retry: 1, // Only retry once
  });

  const errorMessage = response?.error || (error instanceof Error ? error.message : undefined);
  const sheets = response?.data || [];
  const selectedValue = form.watch(name);
  const selectedSheet = sheets.find(sheet => sheet.id === selectedValue);

  const displayLabel = label ?? t('sheet');
  const displayPlaceholder = placeholder ?? t('select_sheet');

  useEffect(() => {
    // Clear selection if connection changes or if there's an error
    if (connectionId || errorMessage) {
      form.setValue(name, undefined);
    }
  }, [connectionId, errorMessage, form, name]);

  return (
    <FormItem>
      {displayLabel && <FormLabel>{displayLabel}</FormLabel>}
      {errorMessage && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                !selectedValue && "text-muted-foreground"
              )}
              disabled={isLoading || isError || !connectionId || !!errorMessage}
            >
              {isLoading ? (
                <span className='flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}...</span>
              ) : isError || errorMessage ? (
                <span className="text-destructive">{t('errorLoading')}</span>
              ) : !connectionId ? (
                t('selectConnectionFirst')
              ) : selectedValue && selectedSheet ? (
                selectedSheet.name
              ) : (
                displayPlaceholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('search_sheets')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm">{t('loading')}</div>
              ) : isError || errorMessage ? (
                <div className="py-6 text-center text-sm text-destructive">{t('errorLoading')}</div>
              ) : sheets.length === 0 ? (
                <CommandEmpty>
                  {search ? t('no_sheets_match_search') : t('no_sheets_found')}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {sheets.map(sheet => (
                    <CommandItem
                      key={sheet.id}
                      value={sheet.id}
                      onSelect={() => {
                        form.setValue(name, sheet.id, { shouldValidate: true });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValue === sheet.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {sheet.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );
} 