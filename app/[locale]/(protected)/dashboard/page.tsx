'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from "@/components/tables/data-table"
import { getDevices, DeviceWithMetadata } from "@/lib/data/devices"
import { DeviceStatus } from '@prisma/client'
import { PhoneIcon, SignalIcon } from 'lucide-react'
import { DataTableFilter, RowDataWithActions } from '@/components/tables/data-table'
import { deviceColumns } from '@/components/tables/devices/devices-table-collumns'
import { getDevicesAction } from '@/actions/getDeviceAction'

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

  const { data, isLoading } = useQuery({
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
    <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Devices</h2>
          <p className="text-muted-foreground">
            Manage and monitor all your connected devices
          </p>
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
