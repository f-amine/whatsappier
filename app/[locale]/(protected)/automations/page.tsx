// /whatsappier/app/[locale]/(protected)/automations/page.tsx (No changes needed from your last version)
'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation' // Use standard next/navigation
import { DataTable, DataTableFilter } from "@/components/tables/data-table"
import { TriggerType } from '@prisma/client'
import { Plus, Workflow, SignalIcon } from 'lucide-react'
import { TableTitle } from '@/components/tables/table-title'
import { PermissionNeededTooltip } from '@/components/ui/permission-needed-tooltip'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { useAutomationColumns } from '@/components/tables/automations/automations-table-columns'
import { AutomationWithMeta, getAutomations } from '@/lib/data/automations' // Import getAutomations
import { Link } from '@/i18n/routing' // Use next-intl Link
import React from 'react' // Import React for useMemo, useCallback
import { SeekPage } from '@/types'

export default function AutomationsPage() {
  const t = useTranslations('AutomationsPage');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter Definitions
  const triggerOptions = React.useMemo(() => [
    { label: t('webhook'), value: TriggerType.WEBHOOK, icon: Workflow },
    { label: t('schedule'), value: TriggerType.SCHEDULE, icon: Workflow },
    { label: t('api'), value: TriggerType.API, icon: Workflow },
    { label: t('event'), value: TriggerType.EVENT, icon: Workflow }
  ], [t]);

  const filters: DataTableFilter<string>[] = React.useMemo(() => [
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
  ], [t, triggerOptions]);

  // --- Fetching Data ---
  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ['automations', searchParams.toString()],
    queryFn: async () => {
      const cursor = searchParams.get('cursor');
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
      const triggerParam = searchParams.getAll('trigger');
      const trigger = triggerParam.length > 0 && Object.values(TriggerType).includes(triggerParam[0] as TriggerType)
          ? [triggerParam[0] as TriggerType]
          : undefined;
      const isActiveParam = searchParams.get('isActive');
      const isActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

      return getAutomations({
        cursor: cursor ?? undefined,
        limit,
        trigger: trigger ? trigger[0] : undefined,
        isActive: isActive,
      });
    },
  });

  // --- Get Columns and Bulk Actions from Hook ---
  // Hook now only needs refetch
  const { columns, bulkActions } = useAutomationColumns({ refetch });

  // --- Prepare data for DataTable component ---
   // DataTable needs a specific page shape
   const pageForDataTable: SeekPage<AutomationWithMeta> | undefined = React.useMemo(() => queryData ? {
     data: queryData.data,
     next: queryData.nextCursor ?? null,
     previous: queryData.previousCursor ?? null
   } : undefined, [queryData]);

  // --- Pagination Handler (Passed to DataTable) ---
   const handlePaginationChange = React.useCallback((cursor: string | undefined | null, limit: number) => {
        const newParams = new URLSearchParams(searchParams.toString());
        if (cursor) {
            newParams.set('cursor', cursor);
        } else {
            newParams.delete('cursor');
        }
        newParams.set('limit', limit.toString());
        router.push(`?${newParams.toString()}`, { scroll: false });
   }, [searchParams, router]);


  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <TableTitle description={t('manage_description')}>
          {t('automations')}
        </TableTitle>
        <div className="ml-auto flex flex-row gap-2">
          <PermissionNeededTooltip hasPermission={true}>
            <Link href="/automations/create">
              <Button
                variant="outline"
                className="flex gap-2 items-center"
              >
                <Plus className="w-4 h-4" />
                {t('create_automation')}
              </Button>
            </Link>
          </PermissionNeededTooltip>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        page={pageForDataTable}
        isLoading={isLoading}
        filters={filters}
        bulkActions={bulkActions}
      />
    </div>
  );
}
