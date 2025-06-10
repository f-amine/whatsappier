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
import { getWorksheets } from '@/lib/data/google-sheets';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Worksheet {
  id: string;
  name: string;
  index: number;
}

interface WorksheetSelectorProps {
  form: UseFormReturn<any>;
  name: string;
  connectionId?: string;
  spreadsheetId?: string;
  label?: string;
  placeholder?: string;
}

export function WorksheetSelector({
  form,
  name,
  connectionId,
  spreadsheetId,
  label,
  placeholder
}: WorksheetSelectorProps) {
  const t = useTranslations('Selectors');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['worksheets', connectionId, spreadsheetId, search],
    queryFn: async () => {
      if (!connectionId || !spreadsheetId) return { data: [] };
      const response = await getWorksheets(connectionId, spreadsheetId, { 
        search: search,
        limit: 20 
      });
      return response;
    },
    enabled: !!connectionId && !!spreadsheetId,
    retry: 1,
  });

  const errorMessage = response?.error || (error instanceof Error ? error.message : undefined);
  const worksheets = response?.data || [];
  const selectedValue = form.watch(name);
  const selectedWorksheet = worksheets.find(worksheet => worksheet.name === selectedValue);

  const displayLabel = label ?? t('worksheet');
  const displayPlaceholder = placeholder ?? t('select_worksheet');

  useEffect(() => {
    // Clear selection if connection or spreadsheet changes or if there's an error
    if (!connectionId || !spreadsheetId || errorMessage) {
      form.setValue(name, undefined);
    }
  }, [connectionId, spreadsheetId, errorMessage, form, name]);

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
              disabled={isLoading || isError || !connectionId || !spreadsheetId || !!errorMessage}
            >
              {isLoading ? (
                <span className='flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}...</span>
              ) : isError || errorMessage ? (
                <span className="text-destructive">{t('errorLoading')}</span>
              ) : !connectionId ? (
                t('selectConnectionFirst')
              ) : !spreadsheetId ? (
                t('selectSpreadsheetFirst')
              ) : selectedValue && selectedWorksheet ? (
                selectedWorksheet.name
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
              placeholder={t('search_worksheets')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm">{t('loading')}</div>
              ) : isError || errorMessage ? (
                <div className="py-6 text-center text-sm text-destructive">{t('errorLoading')}</div>
              ) : worksheets.length === 0 ? (
                <CommandEmpty>
                  {search ? t('no_worksheets_match_search') : t('no_worksheets_found')}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {worksheets.map(worksheet => (
                    <CommandItem
                      key={worksheet.id}
                      value={worksheet.name}
                      onSelect={() => {
                        form.setValue(name, worksheet.name, { shouldValidate: true });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValue === worksheet.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{worksheet.name}</span>
                        <span className="text-xs text-muted-foreground">Sheet {worksheet.index + 1}</span>
                      </div>
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
