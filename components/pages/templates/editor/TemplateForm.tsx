"use client"

import { UseFormReturn } from "react-hook-form"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { templateCategories } from "./template-variables"
import { TemplateEditor } from "./TemplateEditor"
import { useTranslations } from "next-intl"

interface FormData {
  name: string
  content: string
  category: string
  language: string
}

interface TemplateFormProps {
  form: UseFormReturn<FormData>
  onSubmit: (data: FormData) => Promise<void>
  submitLabel: string
  onInsertVariable: (variable: string) => void
  onFormatting: (type: 'bold' | 'italic' | 'list') => void
}

export function TemplateForm({
  form,
  onSubmit,
  submitLabel,
  onInsertVariable,
  onFormatting,
}: TemplateFormProps) {
  const t = useTranslations('TemplatesPage')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('template_name')}</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('category_placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {templateCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {t(`categories.${category.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('language_placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <TemplateEditor
          form={form}
          onInsertVariable={onInsertVariable}
          onFormatting={onFormatting}
        />

        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}