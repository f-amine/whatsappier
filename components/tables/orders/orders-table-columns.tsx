"use client"

import { OrderStatus } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { MoreHorizontal, Trash } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RowDataWithActions, BulkAction } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "../table-collumn-header"
import { ConfirmationDeleteDialog } from "@/components/ui/delete-dialog"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { deleteOrder, bulkDeleteOrders, updateOrderStatus } from "@/lib/mutations/orders"
import { OrderWithMetadata } from "@/lib/data/orders"

export const useOrderColumns = (refetch: () => void) => {
  const t = useTranslations('OrdersPage')
  const [selectedRows, setSelectedRows] = useState<OrderWithMetadata[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteOrder(id)
    },
    onSuccess: () => {
      toast.success(t('order_deleted'))
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_deleting'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      return updateOrderStatus(id, status)
    },
    onSuccess: () => {
      toast.success(t('status_updated'))
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_updating'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkDeleteOrders(ids)
    },
    onSuccess: () => {
      toast.success(t('orders_deleted'))
      setSelectedRows([])
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_deleting'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const bulkActions: BulkAction<OrderWithMetadata>[] = useMemo(
    () => [
      {
        render: (_, resetSelection) => {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <ConfirmationDeleteDialog
                title={t('confirm_deletion')}
                message={t('confirm_deletion_message')}
                entityName="orders"
                mutationFn={async () => {
                  try {
                    await bulkDeleteMutation.mutateAsync(
                      selectedRows.map((row) => row.id)
                    )
                    resetSelection()
                    setSelectedRows([])
                  } catch (error) {
                    console.error('Error deleting orders:', error)
                  }
                }}
              >
                {selectedRows.length > 0 && (
                  <Button
                    className="w-full mr-2"
                    onClick={() => setIsDialogOpen(true)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash className="mr-2 w-4" />
                    {`${t('delete')} (${selectedRows.length})`}
                  </Button>
                )}
              </ConfirmationDeleteDialog>
            </div>
          )
        },
      }
    ],
    [bulkDeleteMutation, isDialogOpen, selectedRows, t]
  )

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return 'bg-green-500'
      case OrderStatus.NOT_CONFIRMED:
        return 'bg-red-500'
      case OrderStatus.IN_PROGRESS:
        return 'bg-blue-500'
      default:
        return 'bg-yellow-500'
    }
  }

  const columns: ColumnDef<RowDataWithActions<OrderWithMetadata>, unknown>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => {
            const isChecked = !!value
            table.toggleAllPageRowsSelected(isChecked)
            if (isChecked) {
              const allRows = table.getRowModel().rows.map((row) => row.original)
              const newSelectedRows = [...allRows, ...selectedRows]
              const uniqueRows = Array.from(
                new Map(newSelectedRows.map((item) => [item.id, item])).values()
              )
              setSelectedRows(uniqueRows)
            } else {
              const filteredRows = selectedRows.filter((row) => {
                return !table
                  .getRowModel()
                  .rows.some((r) => r.original.id === row.id)
              })
              setSelectedRows(filteredRows)
            }
          }}
        />
      ),
      cell: ({ row }) => {
        const isChecked = selectedRows.some(
          (selectedRow) => selectedRow.id === row.original.id
        )
        return (
          <Checkbox
            checked={isChecked}
            onCheckedChange={(value) => {
              const isChecked = !!value
              let newSelectedRows = [...selectedRows]
              if (isChecked) {
                const exists = newSelectedRows.some(
                  (selectedRow) => selectedRow.id === row.original.id
                )
                if (!exists) {
                  newSelectedRows.push(row.original)
                }
              } else {
                newSelectedRows = newSelectedRows.filter(
                  (selectedRow) => selectedRow.id !== row.original.id
                )
              }
              setSelectedRows(newSelectedRows)
              row.toggleSelected(!!value)
            }}
          />
        )
      },
    },
    {
      id: "customerName",
      accessorKey: "customerName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('customer_name')} />
      ),
    },
    {
      id: "customerEmail",
      accessorKey: "customerEmail",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('customer_email')} />
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('status')} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as OrderStatus
        return (
          <Badge variant="outline" className={getStatusColor(status)}>
            {t(`status.${status.toLowerCase()}`)}
          </Badge>
        )
      },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('created_at')} />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date
        return <div className="text-left">{date.toLocaleDateString()}</div>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t('change_status')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {Object.values(OrderStatus).map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => updateStatusMutation.mutate({
                        id: order.id,
                        status
                      })}
                    >
                      <Badge variant="outline" className={getStatusColor(status)}>
                        {t(`status.${status.toLowerCase()}`)}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <ConfirmationDeleteDialog
                title={t('confirm_deletion')}
                message={t('confirm_deletion_message')}
                entityName="order"
                mutationFn={async () => {
                  try {
                    await deleteOrderMutation.mutateAsync(order.id)
                  } catch (error) {
                    console.error('Error deleting order:', error)
                  }
                }}
              >
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  {t('delete')}
                </DropdownMenuItem>
              </ConfirmationDeleteDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return {
    columns,
    selectedRows,
    bulkActions,
  }
}
