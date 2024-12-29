import { DeviceStatus } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DeviceWithMetadata } from "@/lib/data/devices"
import { RowDataWithActions } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "../table-collumn-header"

type DeviceColumn = ColumnDef<RowDataWithActions<DeviceWithMetadata>, unknown>

export const deviceColumns: DeviceColumn[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      return <div className="text-left">{row.getValue("name")}</div>
    },
    enableGlobalFilter: true, // Add this to make the column searchable
  },
  {
    id: "phoneNumber",
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone Number" />
    ),
    cell: ({ row }) => {
      return <div className="text-left">{row.getValue("phoneNumber")}</div>
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as DeviceStatus
      return (
        <Badge 
          variant={
            status === "CONNECTED" 
              ? "secondary" 
              : "destructive"
          }
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
      <DataTableColumnHeader column={column} title="Last Updated" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as Date
      return <div className="text-left">{date.toLocaleDateString()}</div>
    },
  },
]
