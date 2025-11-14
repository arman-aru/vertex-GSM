import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET reseller branding for white-label display
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId

    const reseller = await prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        companyName: true,
        customLogoUrl: true,
        customDomain: true,
      },
    })

    if (!reseller) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 })
    }

    return NextResponse.json(reseller)
  } catch (error) {
    console.error("Error fetching branding:", error)
    return NextResponse.json(
      { error: "Failed to fetch branding" },
      { status: 500 }
    )
  }
}
