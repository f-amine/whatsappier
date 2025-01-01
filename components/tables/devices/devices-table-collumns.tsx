"use client";

import { DeviceStatus } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DeviceWithMetadata } from "@/lib/data/devices"
import { RowDataWithActions, BulkAction } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "../table-collumn-header"
import { LogOut, MoreHorizontal, QrCode, Trash } from "lucide-react"
import { useState, useMemo } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { ConfirmationDeleteDialog } from "@/components/ui/delete-dialog"
import { bulkDeleteDevicesAction, checkConnectionStatus, connectDeviceAction, logoutDeviceAction } from "@/lib/mutations/devices"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { DialogTitle } from "@radix-ui/react-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export const useDeviceColumns = (refetch) => {
 const t = useTranslations('DevicesPage')
 const [selectedRows, setSelectedRows] = useState<DeviceWithMetadata[]>([])
 const [isDialogOpen, setIsDialogOpen] = useState(false)
 const [connectDialogOpen, setConnectDialogOpen] = useState(false)
 const [qrCodeData, setQrCodeData] = useState<{ base64: string; code: string; pairingCode: string } | null>(null)
 const [selectedDevice, setSelectedDevice] = useState<DeviceWithMetadata | null>(null)

 const bulkDeleteMutation = useMutation({
   mutationFn: async (ids: string[]) => {
     bulkDeleteDevicesAction(ids)
   },
   onSuccess: () => {
     toast.success(t('devices_deleted'),{
       duration: 5000
     })
     setSelectedRows([])
     refetch()
   },
   onError: (error) => {
     toast.error(t('error_deleting'),{
       description: error instanceof Error ? error.message : undefined,
     })
   },
 })

 const connectDeviceMutation = useMutation({
   mutationFn: connectDeviceAction,
   onSuccess: (data) => {
     setQrCodeData(data)
     setConnectDialogOpen(true)
     refetch()
   },
   onError: (error) => {
     toast.error(t('error_connecting'), {
       description: error instanceof Error ? error.message : undefined,
     })
   },
 })

 const logoutDeviceMutation = useMutation({
   mutationFn: async (deviceId: string) => {
     logoutDeviceAction(deviceId)
   },
   onSuccess: () => {
     toast.success(t('device_logged_out'))
     refetch()
   },
   onError: (error) => {
     toast.error(t('error_logging_out'),{
       description: error instanceof Error ? error.message : undefined,
     })
   },
 })

const ConnectDeviceDialog = ({ device }: { device: DeviceWithMetadata })=> {
  const checkStatus = async () => {
    try {
      const response = await checkConnectionStatus(device.name) 
      if (response.status === 'CONNECTED') {
        setConnectDialogOpen(false)
        toast.success('Connected', {
          description: 'Your WhatsApp instance is now connected',
        })
      } else {
        toast.info('Not Connected', {
          description: 'Please scan the QR code to connect your WhatsApp instance',
        })
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to check connection status',
      })
    }
  }

  return (
    <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('connect_device')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {qrCodeData?.base64 && (
            <div className="flex flex-col items-center gap-4">
              <img 
                src={qrCodeData.base64} 
                alt="QR Code" 
                className="w-64 h-64"
              />
              {qrCodeData.pairingCode && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('pairing_code')}</p>
                  <p className="font-mono text-lg">{qrCodeData.pairingCode}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={checkStatus}>
              Check Connection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

 const bulkActions: BulkAction<DeviceWithMetadata>[] = useMemo(
   () => [
     {
       render: (_, resetSelection) => {
         return (
           <div onClick={(e) => e.stopPropagation()}>
             <ConfirmationDeleteDialog
               title={t('confirm_deletion')}
               message={t('confirm_deletion_message')}
               entityName="devices"
               mutationFn={async () => {
                 try {
                   await bulkDeleteMutation.mutateAsync(
                     selectedRows.map((row) => row.id)
                   )
                   resetSelection()
                   setSelectedRows([])
                 } catch (error) {
                   console.error('Error deleting devices:', error)
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

 const columns: ColumnDef<RowDataWithActions<DeviceWithMetadata>, unknown>[] = [
   {
     id: 'select',
     header: ({ table }) => (
       <Checkbox
         checked={
           table.getIsAllPageRowsSelected() ||
           table.getIsSomePageRowsSelected()
         }
         onCheckedChange={(value) => {
           const isChecked = !!value
           table.toggleAllPageRowsSelected(isChecked)

           if (isChecked) {
             const allRows = table
               .getRowModel()
               .rows.map((row) => row.original)

             const newSelectedRows = [...allRows, ...selectedRows]

             const uniqueRows = Array.from(
               new Map(
                 newSelectedRows.map((item) => [item.id, item])
               ).values()
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
     cell: ({ row }) => {
       return <div className="text-left">{row.getValue("name")}</div>
     },
     enableGlobalFilter: true,
   },
   {
     id: "phoneNumber", 
     accessorKey: "phoneNumber",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title={t('phone_number')} />
     ),
     cell: ({ row }) => {
       return <div className="text-left">{row.getValue("phoneNumber")}</div>
     },
   },
   {
     id: "status",
     accessorKey: "status", 
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title={t('status')} />
     ),
     cell: ({ row }) => {
       const status = row.getValue("status") as DeviceStatus
       return (
         <Badge
           variant={status === "CONNECTED" ? "secondary" : "destructive"}
         >
           {status.toLowerCase()}
         </Badge>
       )
     },
   },
   {
     id: "updatedAt",
     accessorKey: "updatedAt",
     header: ({ column }) => (
       <DataTableColumnHeader column={column} title={t('last_updated')} />
     ),
     cell: ({ row }) => {
       const date = row.getValue("updatedAt") as Date
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
                   logoutDeviceMutation.mutate(row.original.id)
                 }}
               >
                 <LogOut className="h-4 w-4 mr-2" />
                 <span>{t('logout')}</span>
               </DropdownMenuItem>
               <DropdownMenuItem
                 onMouseDown={(e) => {
                   e.stopPropagation()
                   setSelectedDevice(row.original)
                   connectDeviceMutation.mutate(row.original.name)
                 }}
               >
                 <QrCode className="h-4 w-4 mr-2" />
                 <span>{t('connect')}</span>
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
           {selectedDevice && (
             <ConnectDeviceDialog  device={selectedDevice}/>
           )}
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
