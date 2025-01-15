"use client"

import { useState } from "react"
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
  const [isOpen, setIsOpen] = useState(false)

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
        if (selectedText) {
          const lines = selectedText.split('\n')
          const listItems = lines
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.startsWith('• ') ? line : `• ${line}`)
            .join('\n')
          newContent = content.substring(0, start) + listItems + content.substring(end)
        } else {
          newContent = content.substring(0, start) + '• ' + content.substring(end)
        }
        break
    }
    form.setValue('content', newContent)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + (type === 'list' ? 2 : 1),
        end + (type === 'list' ? 2 : 1)
      )
    }, 0)
  }

  // Extract variables from content
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/{{([^}]+)}}/g) || []
    return [...new Set(matches.map(match => match.slice(2, -2)))]
  }

  const onSubmit = async (data: FormData) => {
    try {
      const variables = extractVariables(data.content)
      
      const templateData = {
        name: data.name,
        content: data.content,
        category: data.category,
        language: data.language,
        variables
      }

      // Log before submission
      console.log('Submitting template:', {
        ...templateData,
        contentLength: templateData.content.length,
        variablesCount: variables.length
      })

      const template = await createTemplate(templateData)

      if (template?.id) {
        console.log('Template created successfully:', {
          id: template.id,
          name: template.name
        })
        
        form.reset()
        setIsOpen(false)
        toast({
          title: t('template_created'),
          description: t('template_created_description'),
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create template')
      
      console.log('Template creation failed:', {
        message: error.message,
        name: error.name
      })
      
      toast({
        title: t('error'),
        description: error.message || t('error_creating_template'),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('create_template')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="w-full">
          <TabsList>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('edit')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {t('preview')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit">
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