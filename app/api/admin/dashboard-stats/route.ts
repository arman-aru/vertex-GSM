import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId

    // Get current month date range
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Fetch order statistics by status
    const [waiting, inProcess, success, rejected] = await Promise.all([
      prisma.order.count({
        where: {
          resellerId,
          status: "PENDING",
        },
      }),
      prisma.order.count({
        where: {
          resellerId,
          status: "PENDING", // You can add more statuses here if you have IN_PROCESS
        },
      }),
      prisma.order.count({
        where: {
          resellerId,
          status: "COMPLETED",
        },
      }),
      prisma.order.count({
        where: {
          resellerId,
          status: "CANCELLED",
        },
      }),
    ])

    // Calculate total revenue and profit for this month
    const monthlyOrders = await prisma.order.findMany({
      where: {
        resellerId,
        status: "COMPLETED",
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      include: {
        transactions: true,
      },
    })

    const totalProfit = monthlyOrders.reduce(
      (sum: number, order: any) => sum + order.totalAmount,
      0
    )

    const invoicePaid = await prisma.transaction.count({
      where: {
        resellerId,
        status: "paid",
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    })

    // Count new customers this month
    const newCustomers = await prisma.user.count({
      where: {
        resellerId,
        role: "END_USER",
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    })

    // Get revenue data for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const revenueData = await prisma.$queryRaw<
      Array<{ month: string; revenue: number; profit: number }>
    >`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
        SUM("totalAmount") as revenue,
        SUM("totalAmount" * 0.7) as profit
      FROM "orders"
      WHERE "resellerId" = ${resellerId}
        AND "status" = 'COMPLETED'
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `

    // Get new customer data for the last 6 months
    const customerData = await prisma.$queryRaw<
      Array<{ month: string; customers: number }>
    >`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
        COUNT(*) as customers
      FROM "users"
      WHERE "resellerId" = ${resellerId}
        AND "role" = 'END_USER'
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `

    return NextResponse.json({
      orderStats: {
        waiting,
        inProcess,
        success,
        rejected,
      },
      monthlyStats: {
        totalProfit,
        invoicePaid,
        newCustomers,
      },
      revenueData: revenueData.map((item: any) => ({
        month: item.month,
        revenue: Number(item.revenue),
        profit: Number(item.profit),
      })),
      customerData: customerData.map((item: any) => ({
        month: item.month,
        customers: Number(item.customers),
      })),
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    )
  }
}
