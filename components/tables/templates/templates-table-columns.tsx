// components/tables/templates/templates-table-columns.tsx
"use client";

import { Template } from "@prisma/client"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { bulkDeleteTemplates } from "@/lib/mutations/templates"

export interface TemplateWithVariables extends Template {
  variables: string[]
}

export const useTemplateColumns = (refetch: () => void) => {
  const t = useTranslations('TemplatesPage')
  const [selectedRows, setSelectedRows] = useState<TemplateWithVariables[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkDeleteTemplates(ids)
    },
    onSuccess: () => {
      toast.success(t('templates_deleted'))
      setSelectedRows([])
      refetch()
    },
    onError: (error) => {
      toast.error(t('error_deleting'), {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const bulkActions: BulkAction<TemplateWithVariables>[] = useMemo(
    () => [
      {
        render: (_, resetSelection) => {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <ConfirmationDeleteDialog
                title={t('confirm_deletion')}
                message={t('confirm_deletion_message')}
                entityName="templates"
                mutationFn={async () => {
                  try {
                    await bulkDeleteMutation.mutateAsync(
                      selectedRows.map((row) => row.id)
                    )
                    resetSelection()
                    setSelectedRows([])
                  } catch (error) {
                    console.error('Error deleting templates:', error)
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

  const columns: ColumnDef<RowDataWithActions<TemplateWithVariables>, unknown>[] = [
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
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('name')} />
      ),
    },
    {
      id: "variables",
      accessorKey: "variables",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('variables')} />
      ),
      cell: ({ row }) => {
        const variables = row.getValue("variables") as string[]
        return (
          <div className="flex flex-wrap gap-1">
            {variables.map((variable) => (
              <span key={variable} className="px-2 py-1 bg-secondary rounded-md text-sm">
                {variable}
              </span>
            ))}
          </div>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle edit
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle delete
                }}
              >
                Delete
              </DropdownMenuItem>
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