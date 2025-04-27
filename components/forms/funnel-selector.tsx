'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFunnels } from '@/lib/data/lightfunnels';

interface Funnel {
  id: string;
  name: string;
}

interface FunnelSelectorProps {
  form: UseFormReturn<any>;
  name: string;
  connectionId?: string | null;
  label?: string;
  placeholder?: string;
}

export function FunnelSelector({
  form,
  name,
  connectionId,
  label = "Funnel",
  placeholder = "Select a funnel..."
}: FunnelSelectorProps) {
  const t = useTranslations('Selectors');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Store selected funnel in local state to avoid form.watch
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | undefined>(form.getValues(name));
  const [selectedFunnelName, setSelectedFunnelName] = useState<string | undefined>(undefined);
  
  // Query funnels
  const { data: funnels = [], isLoading, isError } = useQuery<Funnel[], Error>({
    queryKey: ['lightfunnelsFunnels', connectionId, search],
    queryFn: async () => {
      return await getFunnels(connectionId, { query: search });
    },
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Update selected funnel name when funnels load
  useEffect(() => {
    if (selectedFunnelId && funnels.length > 0) {
      const funnel = funnels.find(f => f.id === selectedFunnelId);
      if (funnel) {
        setSelectedFunnelName(funnel.name);
      }
    }
  }, [funnels, selectedFunnelId]);

  // Reset funnel selection if connection changes
  useEffect(() => {
    if (!connectionId) {
      form.setValue(name, undefined, { shouldValidate: true });
      setSelectedFunnelId(undefined);
      setSelectedFunnelName(undefined);
    }
  }, [connectionId, form, name]);

  // Handle selecting a funnel
  const handleSelect = useCallback((funnel: Funnel) => {
    form.setValue(name, funnel.id, { shouldValidate: true });
    setSelectedFunnelId(funnel.id);
    setSelectedFunnelName(funnel.name);
    setOpen(false);
    setSearch("");
  }, [form, name]);

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Popover 
        open={open} 
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setSearch("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                !selectedFunnelId && "text-muted-foreground"
              )}
              disabled={!connectionId || isLoading || isError}
            >
              {isLoading ? (
                <span className='flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}...</span>
              ) : isError ? (
                <span className="text-destructive">{t('errorLoadingFunnels')}</span>
              ) : selectedFunnelId && selectedFunnelName ? (
                selectedFunnelName
              ) : !connectionId ? (
                t('selectConnectionFirst')
              ) : (
                placeholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('search_funnels')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm">{t('loading')}</div>
              ) : isError ? (
                <div className="py-6 text-center text-sm text-destructive">{t('errorLoadingFunnels')}</div>
              ) : !connectionId ? (
                <div className="py-6 text-center text-sm">{t('selectConnectionFirst')}</div>
              ) : funnels.length === 0 ? (
                <CommandEmpty>
                  {search ? t('no_funnels_match_search') : t('no_funnels_found')}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {funnels.map(funnel => (
                    <CommandItem
                      key={funnel.id}
                      value={funnel.id}
                      onSelect={() => handleSelect(funnel)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedFunnelId === funnel.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {funnel.name}
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
