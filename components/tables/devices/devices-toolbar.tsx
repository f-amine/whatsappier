"use client"

import { Table } from "@tanstack/react-table"
import { X, Wifi, WifiOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DeviceStatus } from "@prisma/client"
import { DataTableFacetedFilter } from "../table-faceted-filter"
import { DataTableViewOptions } from "../table-view-options"

export const deviceStatuses = [
  {
    value: "CONNECTED",
    label: "Connected",
    icon: Wifi,
  },
  {
    value: "DISCONNECTED",
    label: "Disconnected",
    icon: WifiOff,
  },
]

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DevicesToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter devices..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={deviceStatuses}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
