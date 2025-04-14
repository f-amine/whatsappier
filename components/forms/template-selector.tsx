'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList
} from "@/components/ui/command"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTemplates } from '@/lib/data/templates'

export function TemplateSelector({ form, name }) {
  const t = useTranslations('AutomationsPage')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [search])
  
  const { data: response, isLoading } = useQuery({
    queryKey: ['templates', debouncedSearch],
    queryFn: async () => {
      const response = await getTemplates({ search: debouncedSearch })
      return response
    }
  })
  
  const templates = response?.data || []
  const selectedValue = form.watch(name)
  const selectedTemplate = templates.find(template => template.id === selectedValue)

  return (
    <FormItem>
      <FormLabel>{t('template')}</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedValue && selectedTemplate ? (
                selectedTemplate.name
              ) : (
                t('select_template')
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder={t('search_templates')} 
              value={search}
              onValueChange={setSearch}
            />
            {isLoading ? (
              <div className="py-6 text-center text-sm">{t('loading')}</div>
            ) : (
              <>
                <CommandEmpty>{t('no_templates_found')}</CommandEmpty>
                <CommandGroup>
                  <CommandList>
                  {templates.map(template => (
                    <CommandItem
                      key={template.id}
                      value={template.id}
                      onSelect={() => {
                        form.setValue(name, template.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValue === template.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {template.name}
                    </CommandItem>
                  ))}
                  </CommandList>
                </CommandGroup>
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )
}
