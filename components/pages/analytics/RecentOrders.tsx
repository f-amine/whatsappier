"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { OrderStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"

interface RecentOrder {
  customerName: string
  customerEmail: string
  status: OrderStatus
  connectionName: string
}

interface RecentOrdersProps {
  orders: RecentOrder[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-500"
      case "NOT_CONFIRMED":
        return "bg-red-500"
      case "IN_PROGRESS":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getFallbackInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="space-y-8">
      {orders.map((order, index) => (
        <div key={index} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{getFallbackInitials(order.customerName)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{order.customerName}</p>
            <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
            <p className="text-xs text-muted-foreground">via {order.connectionName}</p>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className={getStatusColor(order.status)}>
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
