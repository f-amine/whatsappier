// components/pages/templates/AddTemplateDialog.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { createTemplate } from "@/lib/mutations/templates"
import { useToast } from "@/hooks/use-toast"

export function CreateTemplateDialog({ children }: { children: React.ReactNode }) {
  const t = useTranslations('TemplatesPage')
  const { toast } = useToast()

  const FormSchema = z.object({
    name: z.string().min(1, {
      message: t('template_name_required'),
    }),
    content: z.string().min(1, {
      message: t('template_content_required'),
    }),
    language: z.string().min(1, {
      message: t('language_required'),
    }),
    category: z.string().min(1, {
      message: t('category_required'),
    }),
  })

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      content: "",
      language: "",
      category: "",
    }
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      await createTemplate(data)
      form.reset()
      toast({
        title: t('template_created'),
        description: t('template_created_description'),
      })
    } catch (error) {
      toast({
        title: t('error'),
        description: t('error_creating_template'),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('create_template')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('template_name')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('template_name_placeholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('template_content')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} 
                      className="h-32" 
                      placeholder={t('template_content_placeholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('language')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('language_placeholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('category')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('category_placeholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              {t('create')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}