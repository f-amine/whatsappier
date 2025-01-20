"use client"

import { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bold, Italic, List, Variable } from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { availableVariables } from "./template-variables"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface FormValues {
  name: string
  content: string
  category: string
  language: string
}

interface TemplateEditorProps {
  form: UseFormReturn<FormValues>
  onInsertVariable: (variable: string) => void
  onFormatting: (type: 'bold' | 'italic' | 'list') => void
}

export function TemplateEditor({ 
  form, 
  onInsertVariable, 
  onFormatting 
}: TemplateEditorProps) {
  const t = useTranslations('TemplatesPage')

  return (
    <div className="space-y-4">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-2 p-1 border rounded-lg bg-background">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormatting('bold')}
            >
              <Bold className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('bold_text')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormatting('italic')}
            >
              <Italic className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('italic_text')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormatting('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('bullet_list')}</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-2" />

        <Select onValueChange={onInsertVariable}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="w-[200px] h-8">
                <div className="flex items-center">
                  <Variable className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('insert_variable')} />
                </div>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('insert_variable')}</TooltipContent>
          </Tooltip>
          <SelectContent>
            {availableVariables.map((variable) => (
              <SelectItem
                key={variable.value}
                value={variable.value}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{variable.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {variable.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Content Editor */}
      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('template_content')}</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                className={cn(
                  "min-h-[300px] font-mono text-sm",
                  "resize-vertical",
                  "leading-relaxed"
                )}
                placeholder="Hello {{customer_name}},

Thank you for your order #{{order_number}}!

Your order details:
• Total: {{total_amount}}
• Status: {{order_status}}

Best regards,
{{store_name}}"
              />
            </FormControl>
            <FormDescription>
              {t('available_formatting')}:
              <span className="block mt-1 space-y-1">
                <code className="text-xs px-1 bg-muted rounded">*text*</code>
                <span className="text-xs"> {t('bold_text')}, </span>
                <code className="text-xs px-1 bg-muted rounded">_text_</code>
                <span className="text-xs"> {t('italic_text')}, </span>
                <code className="text-xs px-1 bg-muted rounded">•</code>
                <span className="text-xs"> {t('bullet_list')}, </span>
                <code className="text-xs px-1 bg-muted rounded">{"{{variable}}"}</code>
                <span className="text-xs"> {t('insert_variable')}</span>
              </span>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}