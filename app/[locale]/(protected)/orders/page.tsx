'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { DataTable } from "@/components/tables/data-table"
import { OrderStatus } from '@prisma/client'
import { Package, SignalIcon } from 'lucide-react'
import { DataTableFilter } from '@/components/tables/data-table'
import { TableTitle } from '@/components/tables/table-title'
import { useTranslations } from 'next-intl'
import { useOrderColumns } from '@/components/tables/orders/orders-table-columns'
import { getOrders } from '@/lib/data/orders'

export default function OrdersPage() {
  const t = useTranslations('OrdersPage')
 
  const statusOptions = [
    { label: t('pending'), value: OrderStatus.PENDING, icon: SignalIcon },
    { label: t('confirmed'), value: OrderStatus.CONFIRMED, icon: SignalIcon },
    { label: t('not_confirmed'), value: OrderStatus.NOT_CONFIRMED, icon: SignalIcon },
    { label: t('in_progress'), value: OrderStatus.IN_PROGRESS, icon: SignalIcon }
  ]

  const filters: DataTableFilter<string>[] = [
    {
      type: 'select',
      title: t('filter_status'),
      accessorKey: 'status',
      icon: Package,
      options: statusOptions,
    }
  ]

  const searchParams = useSearchParams()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', searchParams.toString()],
    queryFn: async () => {
      const cursor = searchParams.get('cursor')
      const limit = searchParams.get('limit') 
        ? parseInt(searchParams.get('limit')!) 
        : 10
      const status = searchParams.getAll('status') as OrderStatus[]

      return getOrders({
        cursor,
        limit,
        status: status.length > 0 ? status[0] : undefined,
      })
    }
  })

  const { columns, bulkActions } = useOrderColumns(refetch)

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex">
        <TableTitle description={t('manage_description')}>
          {t('orders')}
        </TableTitle>
      </div>
      <DataTable
        columns={columns}
        page={data ? {
          data: data.data,
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
