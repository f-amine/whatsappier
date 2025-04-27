'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { getTemplates } from '@/lib/data/templates';

interface Template {
  id: string;
  name: string;
}

interface TemplateSelectorProps {
    form: UseFormReturn<any>;
    name: string;
    label?: string;
    placeholder?: string;
}

export function TemplateSelector({
    form,
    name,
    label,
    placeholder
}: TemplateSelectorProps) {
  const t = useTranslations('Selectors');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Store selected template in local state to avoid form.watch
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(form.getValues(name));
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | undefined>(undefined);

  // Query templates directly with search
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['templates', search],
    queryFn: async () => {
      const response = await getTemplates({ search, limit: 20 });
      return response;
    },
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const templates = response?.data || [];

  // Update selected template name when templates load
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setSelectedTemplateName(template.name);
      }
    }
  }, [templates, selectedTemplateId]);

  // Handle selecting a template
  const handleSelect = useCallback((template: Template) => {
    form.setValue(name, template.id, { shouldValidate: true });
    setSelectedTemplateId(template.id);
    setSelectedTemplateName(template.name);
    setOpen(false);
    setSearch("");
  }, [form, name]);

  const displayLabel = label ?? t('template');
  const displayPlaceholder = placeholder ?? t('select_template');

  return (
    <FormItem>
      {displayLabel && <FormLabel>{displayLabel}</FormLabel>}
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
                 !selectedTemplateId && "text-muted-foreground"
              )}
              disabled={isLoading || isError}
            >
              {isLoading ? (
                  <span className='flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}...</span>
              ) : isError ? (
                  <span className="text-destructive">{t('errorLoading')}</span>
              ): selectedTemplateId && selectedTemplateName ? (
                selectedTemplateName
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
              placeholder={t('search_templates')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm">{t('loading')}</div>
              ) : isError ? (
                <div className="py-6 text-center text-sm text-destructive">{t('errorLoading')}</div>
              ) : templates.length === 0 ? (
                <CommandEmpty>
                  {search ? t('no_templates_match_search') : t('no_templates_found')}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {templates.map(template => (
                    <CommandItem
                      key={template.id}
                      value={template.id}
                      onSelect={() => handleSelect(template)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTemplateId === template.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {template.name}
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
