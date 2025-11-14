"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts"

interface RevenueChartProps {
  data: Array<{
    month: string
    revenue: number
    profit: number
  }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Revenue vs. Profit</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
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
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              formatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface CustomerChartProps {
  data: Array<{
    month: string
    customers: number
  }>
}

export function CustomerChart({ data }: CustomerChartProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>New Customers This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
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
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="customers"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="New Customers"
              dot={{ fill: "#8b5cf6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
