import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// We assume CMS pages are global (super-admin created) and marked published.
// If multi-tenant scoping is required, adjust the where clause accordingly.
export async function GET() {
  try {
    const allowedSlugs = ["about-us", "terms-of-service", "privacy-policy"];
    const pages = await prisma.cMSPage.findMany({
      where: {
        slug: { in: allowedSlugs },
        published: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Failed to fetch footer pages", error);
    return NextResponse.json({ error: "Failed to fetch footer pages" }, { status: 500 });
  }
}
