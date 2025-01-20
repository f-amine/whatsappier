"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Template } from "@prisma/client"
import { templateCategories } from "./editor/template-variables"
import { TemplateEditor } from "./editor/TemplateEditor"
import { TemplatePreview } from "./editor/TemplatePreview"
import { updateTemplate } from "@/lib/mutations/templates"

const FormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  content: z.string().min(1, { message: "Template content is required" }),
  category: z.enum(templateCategories.map(c => c.value) as [string, ...string[]]),
  language: z.string().min(1, { message: "Language is required" }),
})

type FormData = z.infer<typeof FormSchema>

interface EditTemplateDialogProps {
  template: Template
  trigger: React.ReactNode
  onEdit: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditTemplateDialog({ 
  template, 
  trigger, 
  onEdit,
  open,
  onOpenChange 
}: EditTemplateDialogProps) {
  const t = useTranslations('TemplatesPage')
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: template.name,
      content: template.content,
      category: template.category,
      language: template.language,
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

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/{{([^}]+)}}/g) || []
    return [...new Set(matches.map(match => match.slice(2, -2)))]
  }

  const onSubmit = async (data: FormData) => {
    try {
      const variables = extractVariables(data.content)
      
      await updateTemplate({
        id: template.id,
        ...data,
        variables
      })

      toast({
        title: t('template_updated'),
        description: t('template_updated_description'),
      })
      
      onEdit()
      setIsOpen(false)
    } catch (error) {
      console.error('Template update error:', error)
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('error_updating_template'),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open ?? isOpen} onOpenChange={onOpenChange ?? setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('edit_template')}</DialogTitle>
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
                  {t('save_changes')}
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