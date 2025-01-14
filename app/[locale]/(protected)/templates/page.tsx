// app/[locale]/(protected)/templates/page.tsx
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { DataTableSkeleton } from '@/components/tables/table-skeleton'
import { TemplateList } from '@/components/pages/templates/TemplateList'
import { getTemplates } from '@/lib/data/templates'

interface Props {
  params: { locale: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function TemplatesPage({
  params,
  searchParams,
}: Props) {
  const t = await getTranslations('TemplatesPage')
  
  // Safely extract and transform search params
  let limit = 10
  let cursor: string | undefined = undefined

  if (typeof searchParams.limit === 'string') {
    const parsedLimit = parseInt(searchParams.limit)
    if (!isNaN(parsedLimit)) {
      limit = parsedLimit
    }
  }

  if (typeof searchParams.cursor === 'string') {
    cursor = searchParams.cursor
  }

  const templates = await getTemplates({
    cursor,
    limit,
  })

  return (
    <div className="container mx-auto py-4">
      <Suspense fallback={<DataTableSkeleton columnCount={5} rowCount={5} />}>
        <TemplateList templates={templates} />
      </Suspense>
    </div>
  )
}