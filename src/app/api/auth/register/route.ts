import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json()

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Semua field harus diisi" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password minimal 6 karakter" },
                { status: 400 }
            )
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "Email sudah terdaftar" },
                { status: 400 }
            )
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10)

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: "CUSTOMER",
            },
        })

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}
