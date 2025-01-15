// components/pages/templates/AddTemplateDialog.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, MessageSquare } from "lucide-react"
import { createTemplate } from "@/lib/mutations/templates"
import { useToast } from "@/hooks/use-toast"
import { TemplateEditor } from "./editor/TemplateEditor"
import { TemplatePreview } from "./editor/TemplatePreview"
import { templateCategories, TemplateCategory } from "./editor/template-variables"

const FormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  content: z.string().min(1, { message: "Template content is required" }),
  category: z.enum(templateCategories.map(c => c.value) as [string, ...string[]]),
  language: z.string().min(1, { message: "Language is required" }),
})

type FormData = z.infer<typeof FormSchema>

export function CreateTemplateDialog({ children }: { children: React.ReactNode }) {
  const t = useTranslations('TemplatesPage')
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      content: "",
      category: "order_confirmation",
      language: "en",
    }
  })

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const content = form.getValues('content')
      const newContent = content.substring(0, start) + `{{${variable}}}` + content.substring(end)
      form.setValue('content', newContent)
    }
  }

  const handleFormatting = (type: 'bold' | 'italic' | 'list') => {
    const content = form.getValues('content')
    const textarea = document.querySelector('textarea')
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    let newContent = content
    switch (type) {
      case 'bold':
        newContent = content.substring(0, start) + `*${selectedText}*` + content.substring(end)
        break
      case 'italic':
        newContent = content.substring(0, start) + `_${selectedText}_` + content.substring(end)
        break
      case 'list':
        const lines = selectedText ? selectedText.split('\n') : ['']
        const listItems = lines.map(line => `• ${line}`).join('\n')
        newContent = content.substring(0, start) + listItems + content.substring(end)
        break
    }
    form.setValue('content', newContent)
  }

  const onSubmit = async (data: FormData) => {
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
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('create_template')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="w-full">
          <TabsList>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Template Name Field */}
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

                  {/* Category Selection */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('category')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templateCategories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Template Editor Component */}
                <TemplateEditor
                  form={form}
                  onInsertVariable={insertVariable}
                  onFormatting={handleFormatting}
                />

                <Button type="submit" className="w-full">
                  {t('create')}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="preview">
            <TemplatePreview content={form.getValues('content')} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}