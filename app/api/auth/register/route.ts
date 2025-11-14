import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  resellerId: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = registerSchema.parse(body)

    const { email, password, name, resellerId } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // If no resellerId provided, user must be a super admin creating account
    // For now, we'll require resellerId or create a default one
    let finalResellerId = resellerId

    if (!finalResellerId) {
      // Create a default reseller for testing purposes
      // In production, you'd handle this differently
      const defaultReseller = await prisma.reseller.findFirst({
        where: { companyName: "Default Company" }
      })

      if (defaultReseller) {
        finalResellerId = defaultReseller.id
      } else {
        const newReseller = await prisma.reseller.create({
          data: {
            companyName: "Default Company",
            email: email,
          }
        })
        finalResellerId = newReseller.id
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        resellerId: finalResellerId,
        role: "END_USER",
      }
    })

    return NextResponse.json(
      { 
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
