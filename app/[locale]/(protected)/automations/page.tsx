'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from "@/components/tables/data-table"
import { TriggerType } from '@prisma/client'
import { Plus, Workflow, SignalIcon } from 'lucide-react'
import { DataTableFilter, RowDataWithActions } from '@/components/tables/data-table'
import { TableTitle } from '@/components/tables/table-title'
import { PermissionNeededTooltip } from '@/components/ui/permission-needed-tooltip'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { useAutomationColumns } from '@/components/tables/automations/automations-table-columns'
import { CreateAutomationDialog } from '@/components/pages/automations/AddAutomationDialog'
import { AutomationWithMeta } from '@/lib/data/automations'
import { getAutomations } from '@/lib/data/automations'

export default function AutomationsPage() {
  const t = useTranslations('AutomationsPage')
 
  const triggerOptions = [
    { label: t('webhook'), value: TriggerType.WEBHOOK, icon: Workflow },
    { label: t('schedule'), value: TriggerType.SCHEDULE, icon: Workflow },
    { label: t('api'), value: TriggerType.API, icon: Workflow },
    { label: t('event'), value: TriggerType.EVENT, icon: Workflow }
  ]

  const filters: DataTableFilter<string>[] = [
    {
      type: 'select',
      title: t('filter_trigger'),
      accessorKey: 'trigger',
      icon: Workflow,
      options: triggerOptions,
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
    queryKey: ['automations', searchParams.toString()],
    queryFn: async () => {
      const cursor = searchParams.get('cursor')
      const limit = searchParams.get('limit') 
        ? parseInt(searchParams.get('limit')!) 
        : 10
      const trigger = searchParams.getAll('trigger') as TriggerType[]
      const isActive = searchParams.get('isActive')

      return getAutomations({
        cursor,
        limit,
        trigger: trigger.length > 0 ? trigger[0] : undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      })
    }
  })

  const { columns, bulkActions } = useAutomationColumns(refetch)
  const transformedData = data?.data.map(automation => ({
    ...automation,
    delete: () => {},
    update: (payload: Partial<AutomationWithMeta>) => {}
  })) as RowDataWithActions<AutomationWithMeta>[] | undefined

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex">
        <TableTitle description={t('manage_description')}>
          {t('automations')}
        </TableTitle>
        <div className="ml-auto flex flex-row gap-2">
          <PermissionNeededTooltip hasPermission={true}>
            <CreateAutomationDialog
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
                {t('create_automation')}
              </Button>
            </CreateAutomationDialog>
          </PermissionNeededTooltip>
        </div>
      </div>
      <DataTable
        columns={columns}
        page={data ? {
          data: transformedData!,
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
