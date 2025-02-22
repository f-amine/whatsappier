"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


interface OverviewProps {
  data: {
    date: string
    confirmed: number
    notConfirmed: number
    inProgress: number
  }[]
}

export function Overview({ data }: OverviewProps) {
  // Transform the data to match the required format
  const transformedData = data.map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    confirmed: item.confirmed,
    notConfirmed: item.notConfirmed,
    inProgress: item.inProgress
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={transformedData}>
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${value}`} 
            />
            <Bar dataKey="confirmed" fill="#4CAF50" radius={[4, 4, 0, 0]} />
            <Bar dataKey="notConfirmed" fill="#FF5722" radius={[4, 4, 0, 0]} />
            <Bar dataKey="inProgress" fill="#2196F3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
