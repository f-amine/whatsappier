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

export default async function TemplatesPage(props: Props) {
  const t = await getTranslations('TemplatesPage')

  // Default values for pagination
  const limit = 10
  const cursor = undefined

  const templates = await getTemplates({
    cursor,
    limit,
  })

  return (
    <div className="container mx-auto py-4">
      <Suspense fallback={<DataTableSkeleton skeletonRowCount={5} />}>
        <TemplateList templates={templates} />
      </Suspense>
    </div>
  )
}