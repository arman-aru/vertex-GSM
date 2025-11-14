import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET all CMS pages for reseller
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId

    const pages = await prisma.cMSPage.findMany({
      where: { resellerId },
      orderBy: { slug: "asc" },
    })

    return NextResponse.json(pages)
  } catch (error) {
    console.error("Error fetching CMS pages:", error)
    return NextResponse.json(
      { error: "Failed to fetch CMS pages" },
      { status: 500 }
    )
  }
}

// POST - Create new CMS page
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId
    const body = await req.json()

    // Check if page with slug already exists
    const existing = await prisma.cMSPage.findFirst({
      where: {
        resellerId,
        slug: body.slug,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Page with this slug already exists" },
        { status: 400 }
      )
    }

    const page = await prisma.cMSPage.create({
      data: {
        resellerId,
        slug: body.slug,
        title: body.title,
        content: body.content,
        isPublished: body.isPublished || false,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
      },
    })

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    console.error("Error creating CMS page:", error)
    return NextResponse.json(
      { error: "Failed to create CMS page" },
      { status: 500 }
    )
  }
}
