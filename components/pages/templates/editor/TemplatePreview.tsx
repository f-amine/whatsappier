// components/pages/templates/editor/TemplatePreview.tsx
"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, RefreshCw } from 'lucide-react'
import { sampleData, type VariableData } from './template-variables'

interface TemplatePreviewProps {
  content: string
}

export function TemplatePreview({ content }: TemplatePreviewProps) {
  const [previewData, setPreviewData] = useState<VariableData>(sampleData)

  const previewContent = (content: string) => {
    let preview = content
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    // Convert WhatsApp formatting
    preview = preview
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/•(.*)/g, '<li>$1</li>')
    return preview
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="outline" size="sm" onClick={() => setPreviewData(sampleData)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Sample Data
        </Button>
      </div>

      <Card className="bg-white dark:bg-gray-800 max-w-md mx-auto">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Phone className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">WhatsApp Preview</span>
          </div>
          
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ 
              __html: previewContent(content) 
            }} 
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {Object.entries(previewData).map(([key, value]) => (
          <div key={key}>
            <Label>{key}</Label>
            <Input
              value={value}
              onChange={(e) => setPreviewData(prev => ({
                ...prev,
                [key]: e.target.value
              }))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}