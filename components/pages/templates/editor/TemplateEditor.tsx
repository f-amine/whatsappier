// components/pages/templates/editor/TemplateEditor.tsx
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
    return (
      <div className="space-y-4">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-2 p-1 border rounded-lg bg-background">
          {/* ... (toolbar code remains the same) ... */}
        </div>
  
        {/* Template Content Editor */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Content</FormLabel>
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
  - Total: {{total_amount}}
  - Status: {{order_status}}
  
  Best regards,
  {{store_name}}"
                />
              </FormControl>
              <FormDescription>
                Available formatting: 
                <span className="block mt-1 space-y-1">
                  <code className="text-xs px-1 bg-muted rounded">*text*</code>
                  <span className="text-xs"> for bold, </span>
                  <code className="text-xs px-1 bg-muted rounded">_text_</code>
                  <span className="text-xs"> for italic, </span>
                  <code className="text-xs px-1 bg-muted rounded">•</code>
                  <span className="text-xs"> for bullet lists, </span>
                  <code className="text-xs px-1 bg-muted rounded">{"{{variable}}"}</code>
                  <span className="text-xs"> for variables</span>
                </span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    )
  }