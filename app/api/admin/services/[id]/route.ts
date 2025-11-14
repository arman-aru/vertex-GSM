import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH - Update service
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
    const body = await req.json()
    const { id } = params

    // Verify service belongs to reseller
    const existingService = await prisma.managedService.findFirst({
      where: {
        id,
        resellerId,
      },
    })

    if (!existingService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const service = await prisma.managedService.update({
      where: { id },
      data: body,
      include: {
        supplier: true,
      },
    })

    return NextResponse.json(service)
  } catch (error) {
    console.error("Error updating service:", error)
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    )
  }
}

// DELETE - Delete service
export async function DELETE(
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

    // Verify service belongs to reseller
    const existingService = await prisma.managedService.findFirst({
      where: {
        id,
        resellerId,
      },
    })

    if (!existingService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    await prisma.managedService.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Service deleted successfully" })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    )
  }
}
