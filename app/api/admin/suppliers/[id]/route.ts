import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH - Update supplier
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

    // Verify supplier belongs to reseller
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        resellerId,
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    )
  }
}

// DELETE - Delete supplier
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

    // Verify supplier belongs to reseller
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        resellerId,
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    // Check if supplier has services
    const serviceCount = await prisma.managedService.count({
      where: { supplierId: id },
    })

    if (serviceCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete supplier with ${serviceCount} active services` },
        { status: 400 }
      )
    }

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Supplier deleted successfully" })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    )
  }
}
