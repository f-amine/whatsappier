'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from "@/components/tables/data-table"
import {  DeviceWithMetadata } from "@/lib/data/devices"
import { DeviceStatus } from '@prisma/client'
import { ChevronDown, PhoneIcon, SignalIcon } from 'lucide-react'
import { DataTableFilter, RowDataWithActions } from '@/components/tables/data-table'
import { deviceColumns } from '@/components/tables/devices/devices-table-collumns'
import { getDevicesAction } from '@/actions/getDeviceAction'
import { TableTitle } from '@/components/tables/table-title'
import { PermissionNeededTooltip } from '@/components/ui/permission-needed-tooltip'
import { Button } from '@/components/ui/button'
import { CreateDeviceDialog } from '@/components/pages/devices/addDeviceDialog'

const statusOptions = [
  { label: 'Connected', value: 'CONNECTED', icon: SignalIcon },
  { label: 'Disconnected', value: 'DISCONNECTED', icon: SignalIcon }
]

const filters: DataTableFilter<string>[] = [
  {
    type: 'select',
    title: 'Status',
    accessorKey: 'status',
    icon: SignalIcon,
    options: statusOptions,
  },
  {
    type: 'input',
    title: 'Search',
    accessorKey: 'name', 
    icon: PhoneIcon,
    options: [],
  },
]

export default function DevicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { data, isLoading ,refetch} = useQuery({
    queryKey: ['devices', searchParams.toString()],
    queryFn: async () => {
      const cursor = searchParams.get('cursor')
      const limit = searchParams.get('limit') 
        ? parseInt(searchParams.get('limit')!) 
        : 10
      const status = searchParams.getAll('status') as DeviceStatus[]
      const search = searchParams.get('search')

      const result = await getDevicesAction({
        cursor: cursor ?? undefined,
        limit,
        status: status.length > 0 ? status[0] : undefined,
        search: search ?? undefined
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    }
  })

  // Transform the data to include the required action methods
  const transformedData = data?.data.map(device => ({
    ...device,
    delete: () => {},
    update: (payload: Partial<DeviceWithMetadata>) => {}
  })) as RowDataWithActions<DeviceWithMetadata>[] | undefined

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex">
          <TableTitle description="Manage and monitor all your connected devices">
            Devices
          </TableTitle>
          <div className="ml-auto flex flex-row gap-2">
            <PermissionNeededTooltip hasPermission={true}>
            <CreateDeviceDialog
              insideBuilder={false}
              onRefresh={() => {
                refetch();
              }}
            >
              <Button
                disabled={false}
                variant="outline"
                className="flex gap-2 items-center"
              >
                <ChevronDown className="w-4 h-4" />
                {'Create Device'}
              </Button>
            </CreateDeviceDialog>
            </PermissionNeededTooltip>
          </div>
      </div>
      <DataTable
        columns={deviceColumns}
        page={data ? {
          data: transformedData!,
          next: data.hasNextPage ? data.nextCursor : undefined,
          previous: data.hasPreviousPage ? data.previousCursor : undefined
        } : undefined}
        isLoading={isLoading}
        filters={filters}
        onRowClick={(row) => {
          router.push(`/devices/${row.id}`)
        }}
      />
    </div>
  )
}
