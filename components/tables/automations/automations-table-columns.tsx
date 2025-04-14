"use client"

import { TriggerType } from "@prisma/client"
import { ColumnDef, HeaderContext, CellContext } from "@tanstack/react-table"; // Import context types
import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { MoreHorizontal, Trash, PlayCircle, StopCircle, Workflow } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RowDataWithActions, BulkAction } from "@/components/tables/data-table" // Import RowDataWithActions
import { DataTableColumnHeader } from "../table-collumn-header"
import { ConfirmationDeleteDialog } from "@/components/ui/delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { AutomationWithMeta } from "@/lib/data/automations"
import { bulkDeleteAutomations, deleteAutomation, updateAutomation } from "@/lib/automations/actions/automations";

// Simplified props: only needs refetch for mutations
interface UseAutomationColumnsProps {
    refetch: () => void;
}

// Define the row data type expected by columns
type AutomationRowData = RowDataWithActions<AutomationWithMeta>;

export const useAutomationColumns = ({ refetch }: UseAutomationColumnsProps) => {
  const t = useTranslations('AutomationsPage');
  // No selectedRows state needed here

  // --- Mutations ---
  const deleteAutomationMutation = useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => { toast.success(t('automation_deleted')); refetch(); },
    onError: (error: any) => { toast.error(t('error_deleting'), { description: error.message }); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteAutomations,
    onSuccess: (data) => {
      toast.success(t('automations_deleted', { count: data.count }));
      // No need to manage selectedRows state here
      // Resetting selection happens in DataTable via the callback
      refetch();
    },
    onError: (error: any) => { toast.error(t('error_deleting'), { description: error.message }); },
  });

  const toggleAutomationMutation = useMutation({
     mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => updateAutomation({ id, isActive }),
     onSuccess: () => { refetch(); },
     onError: (error: any) => { toast.error(t('error_updating'), { description: error.message }); },
   });

  // --- Bulk Actions Configuration ---
  const bulkActions: BulkAction<AutomationRowData>[] = useMemo(
    () => [
      {
        // Render prop receives selectedRows from DataTable state and resetSelection callback from DataTable
        render: (selectedRowsFromTable, resetSelectionFromTable) => {
          return (
            <ConfirmationDeleteDialog
              title={t('confirm_deletion')}
              message={t('confirm_deletion_message', { count: selectedRowsFromTable.length })}
              entityName="automations"
              mutationFn={async () => {
                  await bulkDeleteMutation.mutateAsync(selectedRowsFromTable.map((row) => row.id));
                  resetSelectionFromTable(); // Call reset provided by DataTable
              }}
            >
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedRowsFromTable.length === 0 || bulkDeleteMutation.isPending}
                className="ml-2"
              >
                <Trash className="mr-2 h-4 w-4" />
                {`${t('delete')} (${selectedRowsFromTable.length})`}
              </Button>
            </ConfirmationDeleteDialog>
          );
        },
      },
    ],
    [bulkDeleteMutation, t] // No dependency on internal selectedRows state
  );


  // --- Columns Definition ---
  // Checkbox logic now uses the table instance passed via context
  const columns: ColumnDef<AutomationRowData>[] = [
    {
      id: 'select',
      header: ({ table }: HeaderContext<AutomationRowData, unknown>) => (
        <Checkbox
          checked={
            table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows on this page"
        />
      ),
      cell: ({ row }: CellContext<AutomationRowData, unknown>) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          // Stop propagation if needed to prevent row click handler
          // onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
     { id: "name", accessorKey: "name", header: ({ column }) => (<DataTableColumnHeader column={column} title={t('name')} />), },
     { id: "trigger", accessorKey: "trigger", header: ({ column }) => (<DataTableColumnHeader column={column} title={t('trigger')} />), cell: ({ row }) => { const trigger = row.getValue("trigger") as TriggerType; return <div className="flex items-center"><Workflow className="mr-2 h-4 w-4 text-muted-foreground" /><span>{trigger}</span></div>; }, },
     { id: "connection", accessorFn: row => row.connection?.platform ?? 'N/A', header: ({ column }) => <DataTableColumnHeader column={column} title={t("connection")} />, cell: ({ row }) => { const c = row.original.connection; if (!c) return <span className="text-muted-foreground">N/A</span>; return <Badge variant={c.isActive ? "secondary" : "outline"}>{c.platform}</Badge>; }, },
     { id: "device", accessorFn: row => row.device?.name ?? 'N/A', header: ({ column }) => <DataTableColumnHeader column={column} title={t("device")} />, cell: ({ row }) => { const d = row.original.device; if (!d) return <span className="text-muted-foreground">N/A</span>; return <Badge variant={d.status === "CONNECTED" ? "secondary" : "outline"}>{d.name}</Badge>; }, },
     { id: "template", accessorFn: row => row.template?.name ?? 'N/A', header: ({ column }) => <DataTableColumnHeader column={column} title={t("template")} />, cell: ({ row }) => { const template = row.original.template; if (!template) return <span className="text-muted-foreground">N/A</span>; return <span>{template.name}</span>; }, },
     { id: "isActive", accessorKey: "isActive", header: ({ column }) => (<DataTableColumnHeader column={column} title={t('status')} />), cell: ({ row }) => { const isActive = row.getValue("isActive") as boolean; return <Badge variant={isActive ? "default" : "outline"}>{isActive ? t('active') : t('inactive')}</Badge>; }, },
    {
      id: "actions",
      cell: ({ row }: CellContext<AutomationRowData, unknown>) => {
        const automation = row.original;
        return (
          // Dropdown menu logic remains the same
          <DropdownMenu>
             <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
             <DropdownMenuContent align="end">
                 <DropdownMenuItem onClick={() => toggleAutomationMutation.mutate({ id: automation.id, isActive: !automation.isActive })} disabled={toggleAutomationMutation.isPending}>
                     {automation.isActive ? <StopCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                     {automation.isActive ? t('stop') : t('start')}
                 </DropdownMenuItem>
                 <ConfirmationDeleteDialog
                     title={t('confirm_deletion_single_title')}
                     message={t('confirm_deletion_single_message', { name: automation.name })}
                     entityName="automation"
                     mutationFn={async () => { await deleteAutomationMutation.mutateAsync(automation.id); }}
                 >
                     <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()} disabled={deleteAutomationMutation.isPending}>
                         <Trash className="mr-2 h-4 w-4" /> {t('delete')}
                     </DropdownMenuItem>
                 </ConfirmationDeleteDialog>
             </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return {
    columns,
    bulkActions,
  };
};
