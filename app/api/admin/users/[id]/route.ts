import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET user details with order history
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId
    const { id } = params

    const user = await prisma.user.findFirst({
      where: {
        id,
        resellerId,
      },
      include: {
        orders: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        _count: {
          select: {
            orders: true,
            supportTickets: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate total spent
    const totalSpent = await prisma.order.aggregate({
      where: {
        userId: id,
        status: "COMPLETED",
      },
      _sum: {
        totalAmount: true,
      },
    })

    return NextResponse.json({
      ...user,
      totalSpent: totalSpent._sum.totalAmount || 0,
    })
  } catch (error) {
    console.error("Error fetching user details:", error)
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    )
  }
}

// PATCH - Update user balance
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId
    const { id } = params
    const body = await req.json()

    // Verify user belongs to reseller
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        resellerId,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update balance
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        balance: body.balance !== undefined ? body.balance : existingUser.balance,
        isActive: body.isActive !== undefined ? body.isActive : existingUser.isActive,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}
