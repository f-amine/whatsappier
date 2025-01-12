'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from "@/components/tables/data-table"
import { Platform } from '@prisma/client'
import { Plus, SignalIcon, Link2Icon } from 'lucide-react'
import { DataTableFilter, RowDataWithActions } from '@/components/tables/data-table'
import { TableTitle } from '@/components/tables/table-title'
import { PermissionNeededTooltip } from '@/components/ui/permission-needed-tooltip'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConnectionWithMetadata, getConnections } from '@/lib/data/connections'
import { CreateConnectionDialog } from '@/components/pages/connections/AddConnectionDialog'
import { useConnectionColumns } from '@/components/tables/connections/connections-table-collumns'

export default function ConnectionsPage() {
  const t = useTranslations('ConnectionsPage')
 
  const platformOptions = [
    { label: 'Shopify', value: Platform.SHOPIFY, icon: Link2Icon },
    { label: 'Light Funnels', value: Platform.LIGHTFUNNELS, icon: Link2Icon },
    { label: 'Google Sheets', value: Platform.GOOGLE_SHEETS, icon: Link2Icon }
  ]

  const filters: DataTableFilter<string>[] = [
    {
      type: 'select',
      title: t('filter_platform'),
      accessorKey: 'platform',
      icon: Link2Icon,
      options: platformOptions,
    },
    {
      type: 'select',
      title: t('filter_status'),
      accessorKey: 'isActive',
      icon: SignalIcon,
      options: [
        { label: t('active'), value: 'true', icon: SignalIcon },
        { label: t('inactive'), value: 'false', icon: SignalIcon }
      ],
    }
  ]

  const searchParams = useSearchParams()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['connections', searchParams.toString()],
    queryFn: async () => {
      const cursor = searchParams.get('cursor')
      const limit = searchParams.get('limit') 
        ? parseInt(searchParams.get('limit')!) 
        : 10
      const platform = searchParams.getAll('platform') as Platform[]
      const isActive = searchParams.get('isActive')

      return getConnections({
        cursor,
        limit,
        platform: platform.length > 0 ? platform[0] : undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      })
    }
  })

  const { columns, bulkActions } = useConnectionColumns(refetch)
  

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex">
        <TableTitle description={t('manage_description')}>
          {t('connections')}
        </TableTitle>
        <div className="ml-auto flex flex-row gap-2">
          <PermissionNeededTooltip hasPermission={true}>
            <CreateConnectionDialog
              onRefresh={() => {
                refetch()
              }}
            >
              <Button
                disabled={false}
                variant="outline"
                className="flex gap-2 items-center"
              >
                <Plus className="w-4 h-4" />
                {t('create_connection')}
              </Button>
            </CreateConnectionDialog>
          </PermissionNeededTooltip>
        </div>
      </div>
      <DataTable
        columns={columns}
        page={data ? {
          data: data.data, // Pass the raw data
          next: data.nextCursor,
          previous: data.previousCursor
        } : undefined}
        isLoading={isLoading}
        filters={filters}
        bulkActions={bulkActions}
      />
    </div>
  )
}
