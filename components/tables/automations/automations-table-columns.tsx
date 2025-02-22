"use client"

import { TriggerType } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { MoreHorizontal, Trash, PlayCircle, StopCircle, Workflow } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RowDataWithActions, BulkAction } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "../table-collumn-header"
import { ConfirmationDeleteDialog } from "@/components/ui/delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { AutomationWithMeta } from "@/lib/data/automations"
import { deleteAutomation, bulkDeleteAutomations, updateAutomation } from "@/lib/mutations/automations"

export const useAutomationColumns = (refetch: () => void) => {
  const t = useTranslations('AutomationsPage')
  const [selectedRows, setSelectedRows] = useState<AutomationWithMeta[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteAutomation(id)
    },
    onSuccess: () => {
      toast.success(t('automation_deleted'))
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_deleting'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return updateAutomation({ id, isActive })
    },
    onSuccess: () => {
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
      return bulkDeleteAutomations(ids)
    },
    onSuccess: () => {
      toast.success(t('automations_deleted'))
      setSelectedRows([])
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_deleting'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const bulkActions: BulkAction<AutomationWithMeta>[] = useMemo(
    () => [
      {
        render: (_, resetSelection) => {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <ConfirmationDeleteDialog
                title={t('confirm_deletion')}
                message={t('confirm_deletion_message')}
                entityName="automations"
                mutationFn={async () => {
                  try {
                    await bulkDeleteMutation.mutateAsync(
                      selectedRows.map((row) => row.id)
                    )
                    resetSelection()
                    setSelectedRows([])
                  } catch (error) {
                    console.error('Error deleting automations:', error)
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

  const columns: ColumnDef<RowDataWithActions<AutomationWithMeta>, unknown>[] = [
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
                return !table.getRowModel().rows.some((r) => r.original.id === row.id)
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
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('name')} />
      ),
    },
    {
      id: "trigger",
      accessorKey: "trigger",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trigger')} />
      ),
      cell: ({ row }) => {
        const trigger = row.getValue("trigger") as TriggerType
        return (
          <div className="flex items-center">
            <Workflow className="mr-2 h-4 w-4" />
            <span>{trigger}</span>
          </div>
        )
      },
    },
    {
      id: "connection",
      accessorKey: "connection",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('connection')} />
      ),
      cell: ({ row }) => {
        const connection = row.getValue("connection") as AutomationWithMeta["connection"]
        return (
          <div className="flex items-center">
            <Badge variant={connection.isActive ? "secondary" : "destructive"}>
              {connection.platform}
            </Badge>
          </div>
        )
      },
    },
    {
      id: "device",
      accessorKey: "device",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('device')} />
      ),
      cell: ({ row }) => {
        const device = row.getValue("device") as AutomationWithMeta["device"]
        return (
          <div className="flex items-center">
            <Badge variant={device.status === "CONNECTED" ? "secondary" : "destructive"}>
              {device.name}
            </Badge>
          </div>
        )
      },
    },
    {
      id: "template",
      accessorKey: "template",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('template')} />
      ),
      cell: ({ row }) => {
        const template = row.getValue("template") as AutomationWithMeta["template"]
        return <span>{template.name}</span>
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
      id: "actions",
      cell: ({ row }) => {
        const automation = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => toggleAutomationMutation.mutate({
                  id: automation.id,
                  isActive: !automation.isActive
                })}
              >
                {automation.isActive ? (
                  <StopCircle className="mr-2 h-4 w-4" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                {automation.isActive ? t('stop') : t('start')}
              </DropdownMenuItem>
              <ConfirmationDeleteDialog
                title={t('confirm_deletion')}
                message={t('confirm_deletion_message')}
                entityName="automation"
                mutationFn={async () => {
                  try {
                    await deleteAutomationMutation.mutateAsync(automation.id)
                  } catch (error) {
                    console.error('Error deleting automation:', error)
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
