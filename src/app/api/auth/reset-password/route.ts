import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: NextRequest) {
    try {
        const { token, email, password } = await request.json()

        if (!token || !email || !password) {
            return NextResponse.json(
                { error: "Data tidak lengkap" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password minimal 6 karakter" },
                { status: 400 }
            )
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex")

        // Find user with valid reset token
        const user = await prisma.user.findFirst({
            where: {
                email,
                passwordResetToken: hashedToken,
                passwordResetExpires: {
                    gt: new Date(), // Token not expired
                },
            },
        })

        if (!user) {
            return NextResponse.json(
                { error: "Link reset tidak valid atau sudah kadaluarsa" },
                { status: 400 }
            )
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 10)

        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        })

        console.log(`[Password Reset] Successfully reset password for: ${user.email}`)

        return NextResponse.json({
            success: true,
            message: "Password berhasil direset",
        })
    } catch (error) {
        console.error("Reset password error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}
