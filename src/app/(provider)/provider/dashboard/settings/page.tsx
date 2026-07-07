import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SettingsClient } from "./SettingsClient"

export default async function ProviderSettingsPage() {
    const session = await auth()
    if (!session?.user?.id) return redirect("/login")

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        select: {
            id: true,
            businessName: true,
            businessType: true,
            businessNumber: true,
            description: true,
            street: true,
            city: true,
            province: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            primaryTechnology: true,
            supportedMaterials: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
            isVerified: true,
            logoUrl: true,
        }
    })

    if (!provider) return redirect("/provider/register")

    const initialData = {
        businessName: provider.businessName,
        businessType: provider.businessType || "",
        businessNumber: provider.businessNumber || "",
        description: provider.description || "",
        street: provider.street || "",
        city: provider.city,
        province: provider.province,
        postalCode: provider.postalCode || "",
        latitude: provider.latitude || null,
        longitude: provider.longitude || null,
        primaryTechnology: provider.primaryTechnology || "",
        supportedMaterials: (provider.supportedMaterials as string[]) || [],
        bankName: provider.bankName || "",
        bankAccountNumber: provider.bankAccountNumber || "",
        bankAccountName: provider.bankAccountName || "",
        isVerified: provider.isVerified,
        logoUrl: provider.logoUrl || "",
    }

    return <SettingsClient initialData={initialData} />
}
