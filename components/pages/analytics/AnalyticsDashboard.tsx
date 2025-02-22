"use client"

import { BarChart, DollarSign, ShoppingCart, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/lib/data/analytics"
import { OrderStatusChart } from "./OrderStatusChart"
import { Overview } from "./Overview"
import { RecentOrders } from "./RecentOrders"

interface AnalyticsDashboardProps {
  monthlyData: AnalyticsData
}

export default function AnalyticsDashboard({ monthlyData }: AnalyticsDashboardProps) {
  const formatGrowth = (value: number) => {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Order Analytics</h2>
          <div className="flex items-center space-x-2">
            <Button>Download</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyData.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {formatGrowth(monthlyData.monthlyGrowth.orders)} from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed Orders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyData.confirmedOrders}</div>
              <p className="text-xs text-muted-foreground">
                {formatGrowth(monthlyData.monthlyGrowth.confirmed)} from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abandoned Checkouts</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyData.abandonedCheckouts}</div>
              <p className="text-xs text-muted-foreground">
                {formatGrowth(monthlyData.monthlyGrowth.abandoned)} from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyData.recoveryRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {formatGrowth(monthlyData.monthlyGrowth.recovery)} from last month
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Order Status Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <OrderStatusChart data={monthlyData.orderStatusChart} />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                You have {monthlyData.totalOrders} orders this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentOrders orders={monthlyData.recentOrders} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4">
          <Overview data={monthlyData.orderStatusChart} />
        </div>
      </div>
    </div>
  )
}
