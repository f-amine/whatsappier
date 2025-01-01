'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from "@/components/tables/data-table"
import { DeviceWithMetadata, getDevices } from "@/lib/data/devices"
import { DeviceStatus } from '@prisma/client'
import { ChevronDown, PhoneIcon, Plus, SignalIcon } from 'lucide-react'
import { DataTableFilter, RowDataWithActions } from '@/components/tables/data-table'
import { TableTitle } from '@/components/tables/table-title'
import { PermissionNeededTooltip } from '@/components/ui/permission-needed-tooltip'
import { Button } from '@/components/ui/button'
import { CreateDeviceDialog } from '@/components/pages/devices/addDeviceDialog'
import { useTranslations } from 'next-intl'
import { useDeviceColumns } from '@/components/tables/devices/devices-table-collumns'
import { toast } from 'sonner'

export default function DevicesPage() {
  const t = useTranslations('DevicesPage')
 
   const statusOptions = [
     { label: t('connected'), value: 'CONNECTED', icon: SignalIcon },
     { label: t('disconnected'), value: 'DISCONNECTED', icon: SignalIcon }
   ]

   const filters: DataTableFilter<string>[] = [
     {
       type: 'select',
       title: t('filter_status'),
       accessorKey: 'status',
       icon: SignalIcon,
       options: statusOptions,
     },
     {
       type: 'input',
       title: t('filter_search'),
       accessorKey: 'name',
       icon: PhoneIcon, 
       options: [],
     },
   ]
  const searchParams = useSearchParams()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices', searchParams.toString()],
    queryFn: async () => {
      const cursor = searchParams.get('cursor')
      const limit = searchParams.get('limit') 
        ? parseInt(searchParams.get('limit')!) 
        : 10
      const status = searchParams.getAll('status') as DeviceStatus[]
      const search = searchParams.get('search')

      const result = await getDevices({
        cursor: cursor ?? undefined,
        limit,
        status: status.length > 0 ? status[0] : undefined,
        search: search ?? undefined
      })

      return result
    }
  })

  const { columns, bulkActions } = useDeviceColumns(refetch)
  const transformedData = data?.data.map(device => ({
    ...device,
    delete: () => {},
    update: (payload: Partial<DeviceWithMetadata>) => {}
  })) as RowDataWithActions<DeviceWithMetadata>[] | undefined

  return (
    <div className="flex flex-col gap-4 w-full">
     <div className="flex">
       <TableTitle description={t('manage_description')}>
         {t('devices')}
       </TableTitle>
       <div className="ml-auto flex flex-row gap-2">
         <PermissionNeededTooltip hasPermission={true}>
           <CreateDeviceDialog
             onRefresh={() => {
               refetch()
               toast.success(t('device_status'), {
                 duration: 5000,
                 description: t('device_connected_success'),
              });
             }}
           >
             <Button
               disabled={false}
               variant="outline"
               className="flex gap-2 items-center"
             >
               <Plus className="w-4 h-4" />
               {t('create_device')}
             </Button>
           </CreateDeviceDialog>
         </PermissionNeededTooltip>
       </div>
     </div>
     <DataTable
       columns={columns}
       page={data ? {
         data: transformedData!,
         next: data.hasNextPage ? data.nextCursor : undefined,
         previous: data.hasPreviousPage ? data.previousCursor : undefined
       } : undefined}
       isLoading={isLoading}
       filters={filters}
       bulkActions={bulkActions}
     />
   </div>
  )
}
