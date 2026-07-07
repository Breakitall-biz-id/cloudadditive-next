import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { error: "Email harus diisi" },
                { status: 400 }
            )
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        })

        // Always return success to prevent email enumeration
        if (!user) {
            console.log(`[Forgot Password] Email not found: ${email}`)
            return NextResponse.json({
                success: true,
                message: "Jika email terdaftar, link reset akan dikirim",
            })
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex")
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        // Hash token before storing (security best practice)
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex")

        // Save token to database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: hashedToken,
                passwordResetExpires: resetExpires,
            },
        })

        // Generate reset URL
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

        // TODO: Send email with resetUrl
        // For now, log to console in development
        console.log(`\n${"=".repeat(60)}`)
        console.log(`[Password Reset Link]`)
        console.log(`User: ${user.email}`)
        console.log(`Token: ${resetToken}`)
        console.log(`URL: ${resetUrl}`)
        console.log(`Expires: ${resetExpires.toISOString()}`)
        console.log(`${"=".repeat(60)}\n`)

        // In production, you would send an email here:
        // await sendPasswordResetEmail(user.email, resetUrl)

        return NextResponse.json({
            success: true,
            message: "Link reset password telah dikirim ke email Anda",
        })
    } catch (error) {
        console.error("Forgot password error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}
