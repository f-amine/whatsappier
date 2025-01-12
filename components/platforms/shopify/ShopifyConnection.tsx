'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PlatformConnectionProps } from "@/types/platform-connection"
import { Icons } from "@/components/shared/icons"
import { connectShopifyStore } from "@/lib/mutations/platforms/shopify"

const shopifyFormSchema = z.object({
  shopUrl: z
    .string()
    .min(1, "Shop URL is required")
    .transform(url => {
      // Remove protocol if present
      return url.replace(/^https?:\/\//, '').trim()
    }),
  adminApiKey: z.string().min(1, "Admin API Key is required"),
})

type ShopifyFormValues = z.infer<typeof shopifyFormSchema>

export function ShopifyConnectionForm({ onSuccess, onError, onCancel }: PlatformConnectionProps) {
  const form = useForm<ShopifyFormValues>({
    resolver: zodResolver(shopifyFormSchema),
    defaultValues: {
      shopUrl: "",
      adminApiKey: "",
    },
  })

  async function onSubmit(data: ShopifyFormValues) {
    try {
      await connectShopifyStore({
        shopUrl: data.shopUrl,
        adminApiKey: data.adminApiKey,
      })
      onSuccess()
    } catch (error) {
      onError(error as Error)
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to connect to Shopify'
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="shopUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shop URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="mystore.com or mystore.myshopify.com" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Enter your Shopify store URL. This can be your custom domain (e.g., mystore.com) 
                or your myshopify.com domain
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminApiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin API Key</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>
                You can find your Admin API Key in your Shopify Admin under Apps {'>'} App and Sales Channel
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <div className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Connect Store
          </Button>
        </div>
      </form>
    </Form>
  )
}
