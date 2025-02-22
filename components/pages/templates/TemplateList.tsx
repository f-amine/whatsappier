"use client"

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const { columns, bulkActions } = useTemplateColumns(() => {
    queryClient.invalidateQueries({ queryKey: ['templates'] })
  })

  const handlePaginationChange = (cursor: string | undefined, limit: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cursor) {
      params.set('cursor', cursor)
    } else {
      params.delete('cursor')
    }
    params.set('limit', limit.toString())
    router.push(`?${params.toString()}`)
  }

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
      <DataTable
        columns={columns}
        page={templates}
        bulkActions={bulkActions}
        isLoading={false}
        onPaginationChange={handlePaginationChange}
      />
    </>
  )
}
