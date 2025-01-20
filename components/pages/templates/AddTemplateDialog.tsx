"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { createTemplate } from "@/lib/mutations/templates"
import { useToast } from "@/hooks/use-toast"
import { templateCategories } from "./editor/template-variables"
import { TemplateDialog } from "./editor/TemplateDialog"
import { TemplateForm } from "./editor/TemplateForm"

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

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/{{([^}]+)}}/g) || []
    return [...new Set(matches.map(match => match.slice(2, -2)))]
  }

  const onSubmit = async (data: FormData) => {
    try {
      const variables = extractVariables(data.content)
      await createTemplate({
        ...data,
        variables,
      })
      form.reset()
      setIsOpen(false)
      toast({
        title: t('template_created'),
        description: t('template_created_description'),
      })
    } catch (error) {
      console.error('Template creation error:', error)
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('error_creating_template'),
        variant: "destructive",
      })
    }
  }

  return (
    <TemplateDialog
      title={t('create_template')}
      trigger={children}
      previewContent={form.getValues('content')}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <TemplateForm
        form={form}
        onSubmit={onSubmit}
        submitLabel={t('create')}
        onInsertVariable={insertVariable}
        onFormatting={handleFormatting}
      />
    </TemplateDialog>
  )
}