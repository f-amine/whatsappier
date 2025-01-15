"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bold, Italic, List, Variable } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { availableVariables } from "./template-variables"

interface TemplateEditorProps {
  form: any  // Replace with proper type
  onInsertVariable: (variable: string) => void
  onFormatting: (type: 'bold' | 'italic' | 'list') => void
}

export function TemplateEditor({ form, onInsertVariable, onFormatting }: TemplateEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => onFormatting('bold')}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => onFormatting('italic')}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => onFormatting('list')}
        >
          <List className="w-4 h-4" />
        </Button>
        <div className="ml-auto">
          <Select onValueChange={onInsertVariable}>
            <SelectTrigger className="w-[200px]">
              <Variable className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Insert variable" />
            </SelectTrigger>
            <SelectContent>
              {availableVariables.map((variable) => (
                <SelectItem key={variable.value} value={variable.value}>
                  {variable.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Template Content</FormLabel>
            <FormControl>
              <Textarea {...field} className="h-64 font-mono" />
            </FormControl>
            <FormDescription>
              Use *text* for bold, _text_ for italic, and • for lists
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}