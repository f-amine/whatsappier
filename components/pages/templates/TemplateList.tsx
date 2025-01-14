// components/pages/templates/TemplateList.tsx
"use client"

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateTemplateDialog } from '@/components/pages/templates/AddTemplateDialog'
import { DataTable } from '@/components/tables/data-table'
import { useTemplateColumns } from '@/components/tables/templates/templates-table-columns'
import { PaginatedTemplateResponse } from '@/lib/data/templates'
import { useQueryClient } from '@tanstack/react-query'

interface TemplateListProps {
  templates: PaginatedTemplateResponse
}

export function TemplateList({ templates }: TemplateListProps) {
  const t = useTranslations('TemplatesPage')
  const queryClient = useQueryClient()
  const { columns, bulkActions } = useTemplateColumns(() => {
    queryClient.invalidateQueries({ queryKey: ['templates'] })
  })

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">{t('templates')}</h1>
        <CreateTemplateDialog>
          <Button className="ml-auto" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('new_template')}
          </Button>
        </CreateTemplateDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('templates_list')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            page={templates}
            bulkActions={bulkActions}
            isLoading={false}
          />
        </CardContent>
      </Card>
    </>
  )
}