import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET reseller branding info
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId

    const reseller = await prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        id: true,
        companyName: true,
        customLogoUrl: true,
        customDomain: true,
        email: true,
        phone: true,
        address: true,
      },
    })

    if (!reseller) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 })
    }

    return NextResponse.json(reseller)
  } catch (error) {
    console.error("Error fetching branding:", error)
    return NextResponse.json(
      { error: "Failed to fetch branding information" },
      { status: 500 }
    )
  }
}

// PATCH - Update branding
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId
    const body = await req.json()

    const reseller = await prisma.reseller.update({
      where: { id: resellerId },
      data: {
        companyName: body.companyName,
        customLogoUrl: body.customLogoUrl,
        customDomain: body.customDomain,
        phone: body.phone,
        address: body.address,
      },
    })

    return NextResponse.json(reseller)
  } catch (error) {
    console.error("Error updating branding:", error)
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 }
    )
  }
}
