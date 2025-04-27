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
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDevices } from '@/lib/data/devices';

interface DeviceSelectorProps {
    form: UseFormReturn<any>;
    name: string;
    label?: string;
    placeholder?: string;
}

export function DeviceSelector({
    form,
    name,
    label,
    placeholder
}: DeviceSelectorProps) {
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

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['devices', debouncedSearch],
    queryFn: async () => {
      const response = await getDevices({ search: debouncedSearch, status: 'CONNECTED', limit: 20 });
      return response;
    },
    enabled: true,
  });

  const devices = response?.data || [];
  const selectedValue = form.watch(name);
  const selectedDevice = devices.find(device => device.id === selectedValue);

  const displayLabel = label ?? t('device');
  const displayPlaceholder = placeholder ?? t('select_device');

  return (
    <FormItem>
      {displayLabel && <FormLabel>{displayLabel}</FormLabel>}
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
              disabled={isLoading || isError}
            >
              {isLoading ? (
                  <span className='flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}...</span>
              ) : isError ? (
                  <span className="text-destructive">{t('errorLoading')}</span>
              ): selectedValue && selectedDevice ? (
                  selectedDevice.name
              ) : (
                  displayPlaceholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('search_devices')}
              value={search}
              onValueChange={setSearch}
            />
            {isLoading ? (
              <div className="py-6 text-center text-sm">{t('loading')}</div>
            ) : isError ? (
               <div className="py-6 text-center text-sm text-destructive">{t('errorLoading')}</div>
            ) : (
              <>
                <CommandEmpty>{t('no_devices_found')}</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {devices.map(device => (
                      <CommandItem
                        key={device.id}
                        value={device.id}
                        onSelect={(currentValue) => {
                          form.setValue(name, currentValue === selectedValue ? "" : currentValue, { shouldValidate: true });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedValue === device.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {device.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );
}
