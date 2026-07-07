"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Types for updates
interface BusinessInfoUpdate {
    businessName: string
    businessType: string
    businessNumber: string
    description: string
    street: string
    city: string
    province: string
    postalCode: string
    latitude?: number | null
    longitude?: number | null
}

interface CapabilitiesUpdate {
    primaryTechnology: string
    supportedMaterials: string[]
}

interface BankAccountUpdate {
    bankName: string
    bankAccountNumber: string
    bankAccountName: string
}

async function getProviderForUser() {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id }
    })

    if (!provider) {
        throw new Error("Provider not found")
    }

    return provider
}

export async function updateProviderBusinessInfo(data: BusinessInfoUpdate) {
    try {
        const provider = await getProviderForUser()

        await prisma.provider.update({
            where: { id: provider.id },
            data: {
                businessName: data.businessName,
                businessType: data.businessType,
                businessNumber: data.businessNumber,
                description: data.description,
                street: data.street,
                city: data.city,
                province: data.province,
                postalCode: data.postalCode,
                latitude: data.latitude,
                longitude: data.longitude,
            }
        })

        revalidatePath("/provider/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update business info:", error)
        return { success: false, error: "Failed to update business information" }
    }
}

export async function updateProviderCapabilities(data: CapabilitiesUpdate) {
    try {
        const provider = await getProviderForUser()

        await prisma.provider.update({
            where: { id: provider.id },
            data: {
                primaryTechnology: data.primaryTechnology,
                supportedMaterials: data.supportedMaterials,
            }
        })

        revalidatePath("/provider/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update capabilities:", error)
        return { success: false, error: "Failed to update capabilities" }
    }
}

export async function updateProviderBankAccount(data: BankAccountUpdate) {
    try {
        const provider = await getProviderForUser()

        await prisma.provider.update({
            where: { id: provider.id },
            data: {
                bankName: data.bankName,
                bankAccountNumber: data.bankAccountNumber,
                bankAccountName: data.bankAccountName,
            }
        })

        revalidatePath("/provider/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update bank account:", error)
        return { success: false, error: "Failed to update bank account" }
    }
}

export async function getProviderSettings() {
    try {
        const provider = await getProviderForUser()

        return {
            success: true,
            data: {
                businessName: provider.businessName,
                businessType: provider.businessType || "",
                businessNumber: provider.businessNumber || "",
                description: provider.description || "",
                street: provider.street || "",
                city: provider.city,
                province: provider.province,
                postalCode: provider.postalCode || "",
                primaryTechnology: provider.primaryTechnology || "",
                supportedMaterials: (provider.supportedMaterials as string[]) || [],
                bankName: provider.bankName || "",
                bankAccountNumber: provider.bankAccountNumber || "",
                bankAccountName: provider.bankAccountName || "",
                isVerified: provider.isVerified,
            }
        }
    } catch (error) {
        console.error("Failed to get provider settings:", error)
        return { success: false, error: "Failed to load settings" }
    }
}
