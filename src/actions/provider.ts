"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function registerProvider(formData: any) {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Not authenticated" }
    }

    try {
        // 1. Check if provider already exists
        const existing = await prisma.provider.findUnique({
            where: { userId: session.user.id }
        })

        if (existing) {
            return { error: "Provider profile already exists" }
        }

        // 2. Prepare description with extra fields (until schema is updated)
        const description = `
Type: ${formData.businessType}
NIB: ${formData.businessNumber}
Lead Time: ${formData.leadTime}
Shipping: ${formData.shippingEnabled ? 'Yes' : 'No'}
Pickup: ${formData.pickupEnabled ? 'Yes' : 'No'}
Couriers: ${formData.supportedCouriers.join(', ')}
        `.trim()

        // 3. transaction to create provider and update user role
        await prisma.$transaction(async (tx) => {
            // Create Provider
            await tx.provider.create({
                data: {
                    userId: session.user.id,
                    businessName: formData.businessName,
                    description: description,
                    street: formData.streetAddress,
                    city: formData.city,
                    province: formData.province,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    isVerified: false, // Pending verification
                }
            })

            // Update User Role
            await tx.user.update({
                where: { id: session.user.id },
                data: { role: Role.PROVIDER }
            })
        })

        revalidatePath("/dashboard")
        return { success: true }

    } catch (error) {
        console.error("Failed to register provider:", error)
        return { error: "Failed to create provider profile. Please try again." }
    }
}
