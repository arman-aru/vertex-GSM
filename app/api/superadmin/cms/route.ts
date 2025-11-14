import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedSlugs = ["about-us", "terms-of-service"];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug || !allowedSlugs.includes(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  try {
    let page = await prisma.cMSPage.findFirst({
      where: { slug, resellerId: session.user.resellerId },
    });
    if (!page) {
      page = await prisma.cMSPage.create({
        data: {
          slug,
          title: slug === "about-us" ? "About Us" : "Terms of Service",
          content: "",
          resellerId: session.user.resellerId,
          isPublished: false,
        },
      });
    }
    return NextResponse.json(page);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load page" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug || !allowedSlugs.includes(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const { title, content, isPublished, metaTitle, metaDescription } = body;
    const updated = await prisma.cMSPage.upsert({
      where: { resellerId_slug: { resellerId: session.user.resellerId, slug } },
      update: {
        ...(title ? { title } : {}),
        ...(typeof content === "string" ? { content } : {}),
        ...(typeof isPublished === "boolean" ? { isPublished } : {}),
        ...(metaTitle ? { metaTitle } : {}),
        ...(metaDescription ? { metaDescription } : {}),
      },
      create: {
        slug,
        title: title || (slug === "about-us" ? "About Us" : "Terms of Service"),
        content: content || "",
        resellerId: session.user.resellerId,
        isPublished: typeof isPublished === "boolean" ? isPublished : false,
        metaTitle,
        metaDescription,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  }
}
