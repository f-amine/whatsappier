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
import { getProducts } from '@/lib/data/lightfunnels';

interface Product {
  id: string;
  name: string;
  price?: number;
  sku?: string;
}

interface ProductSelectorProps {
  form: UseFormReturn<any>;
  name: string;
  connectionId?: string | null;
  label?: string;
  placeholder?: string;
}

export function ProductSelector({
  form,
  name,
  connectionId,
  label = "Product",
  placeholder = "Select a product..."
}: ProductSelectorProps) {
  const t = useTranslations('Selectors');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(form.getValues(name));
  const [selectedProductName, setSelectedProductName] = useState<string | undefined>(undefined);
  
  // Query products
  const { data: products = [], isLoading, isError } = useQuery<Product[], Error>({
    queryKey: ['lightfunnelsProducts', connectionId, search],
    queryFn: async () => {
      return await getProducts(connectionId, { query: search });
    },
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Update selected product name when products load
  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        setSelectedProductName(product.name);
      }
    }
  }, [products, selectedProductId]);

  // Reset product selection if connection changes
  useEffect(() => {
    if (!connectionId) {
      form.setValue(name, undefined, { shouldValidate: true });
      setSelectedProductId(undefined);
      setSelectedProductName(undefined);
    }
  }, [connectionId, form, name]);

  // Handle selecting a product
  const handleSelect = useCallback((product: Product) => {
    form.setValue(name, product.id, { shouldValidate: true });
    setSelectedProductId(product.id);
    setSelectedProductName(product.name);
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
                !selectedProductId && "text-muted-foreground"
              )}
              disabled={!connectionId || isLoading || isError}
            >
              {isLoading ? (
                <span className='flex items-center'><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}...</span>
              ) : isError ? (
                <span className="text-destructive">{t('errorLoadingProducts')}</span>
              ) : selectedProductId && selectedProductName ? (
                selectedProductName
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
              placeholder={t('search_products')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm">{t('loading')}</div>
              ) : isError ? (
                <div className="py-6 text-center text-sm text-destructive">{t('errorLoadingProducts')}</div>
              ) : !connectionId ? (
                <div className="py-6 text-center text-sm">{t('selectConnectionFirst')}</div>
              ) : products.length === 0 ? (
                <CommandEmpty>
                  {search ? t('no_products_match_search') : t('no_products_found')}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {products.map(product => (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => handleSelect(product)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProductId === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        {product.sku && (
                          <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                        )}
                        {product.price && (
                          <span className="text-xs text-muted-foreground">Price: ${product.price}</span>
                        )}
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
