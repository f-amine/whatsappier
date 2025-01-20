"use client"

import { ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, MessageSquare } from "lucide-react"
import { TemplatePreview } from "./TemplatePreview"
import { useTranslations } from "next-intl"

interface TemplateDialogProps {
  title: string
  children: ReactNode
  trigger: ReactNode
  previewContent: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TemplateDialog({
  title,
  children,
  trigger,
  previewContent,
  open,
  onOpenChange
}: TemplateDialogProps) {
  const t = useTranslations('TemplatesPage')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
            {children}
          </TabsContent>

          <TabsContent value="preview">
            <TemplatePreview content={previewContent} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}