"use client";

import { Platform } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RowDataWithActions, BulkAction } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "../table-collumn-header"
import { MoreHorizontal, Trash, RefreshCw } from "lucide-react"
import { useState, useMemo } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { ConfirmationDeleteDialog } from "@/components/ui/delete-dialog"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { bulkDeleteConnections } from "@/lib/mutations/connections";

export interface ConnectionWithMetadata {
  id: string
  userId: string
  platform: Platform
  credentials: Record<string, any>
  metadata: Record<string, any> | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export const useConnectionColumns = (refetch: () => void) => {
  const t = useTranslations('ConnectionsPage')
  const [selectedRows, setSelectedRows] = useState<ConnectionWithMetadata[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkDeleteConnections(ids)
    },
    onSuccess: () => {
      toast.success(t('connections_deleted'))
      setSelectedRows([])
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_deleting'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const refreshConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      // Will implement later
      console.log('Refreshing connection:', connectionId)
    },
    onSuccess: () => {
      toast.success(t('connection_refreshed'))
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_refreshing'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const bulkActions: BulkAction<ConnectionWithMetadata>[] = useMemo(
    () => [
      {
        render: (_, resetSelection) => {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <ConfirmationDeleteDialog
                title={t('confirm_deletion')}
                message={t('confirm_deletion_message')}
                entityName="connections"
                mutationFn={async () => {
                  try {
                    await bulkDeleteMutation.mutateAsync(
                      selectedRows.map((row) => row.id)
                    )
                    resetSelection()
                    setSelectedRows([])
                  } catch (error) {
                    console.error('Error deleting connections:', error)
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
    [bulkDeleteMutation, isDialogOpen, selectedRows]
  )

  const columns: ColumnDef<RowDataWithActions<ConnectionWithMetadata>, unknown>[] = [
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
      id: "platform",
      accessorKey: "platform",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('platform')} />
      ),
      cell: ({ row }) => {
        const platform = row.getValue("platform") as Platform
        return <div className="text-left">{platform}</div>
      },
    },
    {
      id: "isActive",
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('status')} />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean
        return (
          <Badge variant={isActive ? "secondary" : "destructive"}>
            {isActive ? t('active') : t('inactive')}
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
        return (
          <div className="flex items-center gap-2 justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    refreshConnectionMutation.mutate(row.original.id)
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>{t('refresh')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    }
  ]

  return {
    columns,
    selectedRows,
    bulkActions,
  }
}
