"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, RefreshCw } from 'lucide-react'
import { sampleData } from './template-variables'
import { cn } from '@/lib/utils'

interface TemplatePreviewProps {
  content: string
}

type PreviewData = typeof sampleData

export function TemplatePreview({ content }: TemplatePreviewProps) {
  const [previewData, setPreviewData] = useState<PreviewData>(sampleData)

  const previewContent = (content: string) => {
    let preview = content

    // Replace variables
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    // Process WhatsApp formatting
    // First, split into lines to handle lists properly
    const lines = preview.split('\n')
    let inList = false
    
    preview = lines.map(line => {
      const trimmedLine = line.trim()
      
      // Handle list items
      if (trimmedLine.startsWith('• ')) {
        const listContent = trimmedLine.substring(2)
        if (!inList) {
          inList = true
          return `<ul class="list-disc pl-6 space-y-1"><li>${listContent}</li>`
        }
        return `<li>${listContent}</li>`
      } else if (inList && trimmedLine.length > 0) {
        inList = false
        return `</ul>${trimmedLine}`
      } else if (inList && trimmedLine.length === 0) {
        inList = false
        return '</ul>'
      }
      
      return trimmedLine
    }).join('\n')

    if (inList) {
      preview += '</ul>'
    }

    // Handle bold and italic formatting
    preview = preview
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')

    // Handle line breaks
    preview = preview
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('<br />')

    return preview
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setPreviewData(sampleData)}
          className="text-xs"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Sample Data
        </Button>
      </div>

      <Card className={cn(
        "bg-white dark:bg-gray-800 max-w-md mx-auto",
        "border border-gray-200 dark:border-gray-700"
      )}>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Phone className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">WhatsApp Preview</span>
          </div>
          
          <div 
            className={cn(
              "prose prose-sm max-w-none dark:prose-invert",
              "[&_ul]:my-2 [&_li]:my-1",
              "space-y-2",
              "[&_strong]:font-semibold",
              "[&_em]:italic",
              "whitespace-pre-wrap"
            )}
            dangerouslySetInnerHTML={{ 
              __html: previewContent(content) 
            }} 
          />
        </div>
      </Card>

      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-medium">Preview Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(previewData).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label 
                htmlFor={key}
                className="text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                {key.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Label>
              <Input
                id={key}
                value={value}
                onChange={(e) => setPreviewData(prev => ({
                  ...prev,
                  [key]: e.target.value
                }))}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}