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
import { getConnections } from '@/lib/data/connections'
import { Platform } from '@prisma/client'; // Import Platform enum

// Add platformFilter prop
export function ConnectionSelector({ form, name, platformFilter }: { form: any, name: string, platformFilter?: Platform }) {
  const t = useTranslations('AutomationsPage') // Or specific component translations
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

  // Update query key to include platformFilter
  const queryKey = ['connections', debouncedSearch, platformFilter];
  const { data: response, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const response = await getConnections({
        search: debouncedSearch,
        platform: platformFilter, // Pass the filter here
        limit: 20
      })
      return response
    }
  })

  const connections = response?.data || []
  const selectedValue = form.watch(name)
  const selectedConnection = connections.find(connection => connection.id === selectedValue)

  // Get display name from metadata if available (e.g., Shopify store name)
  const getDisplayName = (connection: typeof connections[0]) => {
      if (connection.platform === Platform.SHOPIFY && connection.metadata?.shopData?.name) {
          return `${connection.platform} - ${connection.metadata.shopData.name} (${connection.credentials?.originalDomain || connection.id.substring(0, 6)})`;
      }
       if (connection.platform === Platform.LIGHTFUNNELS && connection.metadata?.shopName) { // Assuming you store shopName
          return `${connection.platform} - ${connection.metadata.shopName} (${connection.id.substring(0, 6)})`;
       }
      // Fallback display
      return `${connection.platform} - ${connection.id.substring(0, 6)}`;
  }

  return (
    <FormItem>
      <FormLabel>{t('connection')}</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedValue && selectedConnection ? (
                 getDisplayName(selectedConnection) // Use display name function
              ) : (
                t('select_connection')
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('search_connections')}
              value={search}
              onValueChange={setSearch}
            />
            {isLoading ? (
              <div className="py-6 text-center text-sm">{t('loading')}</div>
            ) : (
              <>
                <CommandEmpty>{t('no_connections_found')}</CommandEmpty>
                 <CommandList>
                    <CommandGroup>
                    {connections.map(connection => (
                        <CommandItem
                        key={connection.id}
                        value={connection.id} // Use ID for value
                        onSelect={() => {
                            form.setValue(name, connection.id)
                            setOpen(false)
                        }}
                        >
                        <Check
                            className={cn(
                            "mr-2 h-4 w-4",
                            selectedValue === connection.id ? "opacity-100" : "opacity-0"
                            )}
                        />
                         {getDisplayName(connection)} {/* Use display name function */}
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
  )
}
