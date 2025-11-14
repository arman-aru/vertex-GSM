import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH - Update CMS page
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

    // Verify page belongs to reseller
    const existing = await prisma.cMSPage.findFirst({
      where: {
        id,
        resellerId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    const page = await prisma.cMSPage.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        isPublished: body.isPublished,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
      },
    })

    return NextResponse.json(page)
  } catch (error) {
    console.error("Error updating CMS page:", error)
    return NextResponse.json(
      { error: "Failed to update CMS page" },
      { status: 500 }
    )
  }
}

// DELETE - Delete CMS page
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

    // Verify page belongs to reseller
    const existing = await prisma.cMSPage.findFirst({
      where: {
        id,
        resellerId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    await prisma.cMSPage.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Page deleted successfully" })
  } catch (error) {
    console.error("Error deleting CMS page:", error)
    return NextResponse.json(
      { error: "Failed to delete CMS page" },
      { status: 500 }
    )
  }
}
