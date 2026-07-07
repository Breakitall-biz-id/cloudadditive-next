"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

// ==================== PROFILE ====================

export async function getCustomerProfile() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                addresses: {
                    orderBy: [
                        { isDefault: "desc" },
                        { createdAt: "desc" },
                    ],
                },
            },
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        return { success: true, data: user }
    } catch (error) {
        console.error("Failed to get customer profile:", error)
        return { success: false, error: "Gagal memuat profil" }
    }
}

interface ProfileUpdate {
    name: string
    phone?: string
}

export async function updateCustomerProfile(data: ProfileUpdate) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: data.name,
                phone: data.phone || null,
            },
        })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update profile:", error)
        return { success: false, error: "Gagal memperbarui profil" }
    }
}

// ==================== ADDRESSES ====================

interface AddressData {
    label: string
    recipientName: string
    phone: string
    street: string
    city: string
    province: string
    postalCode: string
    latitude?: number | null
    longitude?: number | null
    isDefault?: boolean
}

export async function addCustomerAddress(data: AddressData) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // If setting as default, unset other defaults first
        if (data.isDefault) {
            await prisma.address.updateMany({
                where: { userId: session.user.id, isDefault: true },
                data: { isDefault: false },
            })
        }

        const address = await prisma.address.create({
            data: {
                userId: session.user.id,
                label: data.label,
                recipientName: data.recipientName,
                phone: data.phone,
                street: data.street,
                city: data.city,
                province: data.province,
                postalCode: data.postalCode,
                latitude: data.latitude,
                longitude: data.longitude,
                isDefault: data.isDefault ?? false,
            },
        })

        revalidatePath("/dashboard/settings")
        return { success: true, data: address }
    } catch (error) {
        console.error("Failed to add address:", error)
        return { success: false, error: "Gagal menambahkan alamat" }
    }
}

export async function updateCustomerAddress(addressId: string, data: Partial<AddressData>) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id: addressId, userId: session.user.id },
        })

        if (!existing) {
            return { success: false, error: "Alamat tidak ditemukan" }
        }

        // If setting as default, unset other defaults first
        if (data.isDefault) {
            await prisma.address.updateMany({
                where: { userId: session.user.id, isDefault: true, id: { not: addressId } },
                data: { isDefault: false },
            })
        }

        await prisma.address.update({
            where: { id: addressId },
            data,
        })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update address:", error)
        return { success: false, error: "Gagal memperbarui alamat" }
    }
}

export async function deleteCustomerAddress(addressId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const existing = await prisma.address.findFirst({
            where: { id: addressId, userId: session.user.id },
        })

        if (!existing) {
            return { success: false, error: "Alamat tidak ditemukan" }
        }

        await prisma.address.delete({ where: { id: addressId } })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete address:", error)
        return { success: false, error: "Gagal menghapus alamat" }
    }
}

export async function setDefaultAddress(addressId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id: addressId, userId: session.user.id },
        })

        if (!existing) {
            return { success: false, error: "Alamat tidak ditemukan" }
        }

        // Unset all defaults, then set the chosen one
        await prisma.address.updateMany({
            where: { userId: session.user.id, isDefault: true },
            data: { isDefault: false },
        })

        await prisma.address.update({
            where: { id: addressId },
            data: { isDefault: true },
        })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to set default address:", error)
        return { success: false, error: "Gagal mengatur alamat utama" }
    }
}

export async function getUserAddresses() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, addresses: [] }
    }

    try {
        const addresses = await prisma.address.findMany({
            where: { userId: session.user.id },
            orderBy: [
                { isDefault: "desc" },
                { createdAt: "desc" },
            ],
        })

        return { success: true, addresses }
    } catch (error) {
        console.error("Failed to get user addresses:", error)
        return { success: false, addresses: [] }
    }
}


// ==================== SECURITY ====================

interface PasswordChange {
    currentPassword: string
    newPassword: string
}

export async function changeCustomerPassword(data: PasswordChange) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { passwordHash: true },
        })

        if (!user?.passwordHash) {
            return { success: false, error: "Akun ini menggunakan login sosial" }
        }

        const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash)
        if (!isValid) {
            return { success: false, error: "Password saat ini salah" }
        }

        if (data.newPassword.length < 8) {
            return { success: false, error: "Password baru minimal 8 karakter" }
        }

        const newHash = await bcrypt.hash(data.newPassword, 12)
        await prisma.user.update({
            where: { id: session.user.id },
            data: { passwordHash: newHash },
        })

        return { success: true }
    } catch (error) {
        console.error("Failed to change password:", error)
        return { success: false, error: "Gagal mengubah password" }
    }
}

// ==================== NOTIFICATIONS ====================

export type NotificationSettingsPayload = {
    emailEnabled: boolean
    orderConfirmed: boolean
    printStarted: boolean
    printCompleted: boolean
    shippingUpdate: boolean
    paymentSuccess: boolean
    paymentReminder: boolean
    refund: boolean
    promo: boolean
    newsletter: boolean
    productUpdate: boolean
}

export async function getCustomerNotificationSettings() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const existing = await prisma.userNotificationSettings.findUnique({
            where: { userId: session.user.id }
        })

        if (existing) {
            return { success: true, data: existing }
        }

        const created = await prisma.userNotificationSettings.create({
            data: { userId: session.user.id }
        })

        return { success: true, data: created }
    } catch (error) {
        console.error("Failed to get notification settings:", error)
        return { success: false, error: "Gagal memuat pengaturan notifikasi" }
    }
}

export async function updateCustomerNotificationSettings(payload: NotificationSettingsPayload) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.userNotificationSettings.upsert({
            where: { userId: session.user.id },
            update: payload,
            create: {
                userId: session.user.id,
                ...payload,
            }
        })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update notification settings:", error)
        return { success: false, error: "Gagal menyimpan pengaturan notifikasi" }
    }
}

// ==================== SECURITY SETTINGS ====================

export async function getCustomerSecuritySettings() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { twoFactorEnabled: true }
        })

        return {
            success: true,
            data: {
                twoFactorEnabled: user?.twoFactorEnabled ?? false,
                sessionExpires: session.expires || null,
            }
        }
    } catch (error) {
        console.error("Failed to get security settings:", error)
        return { success: false, error: "Gagal memuat pengaturan keamanan" }
    }
}

export async function updateCustomerTwoFactor(enabled: boolean) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { twoFactorEnabled: enabled }
        })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update 2FA setting:", error)
        return { success: false, error: "Gagal memperbarui 2FA" }
    }
}

// ==================== BILLING ====================

export async function getCustomerBillingData() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const payments = await prisma.payment.findMany({
            where: {
                order: { userId: session.user.id }
            },
            select: {
                id: true,
                amount: true,
                status: true,
                paymentMethod: true,
                paidAt: true,
                createdAt: true,
                order: {
                    select: { orderNumber: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 10
        })

        const totalSpent = await prisma.payment.aggregate({
            where: {
                order: { userId: session.user.id },
                status: "PAID"
            },
            _sum: { amount: true }
        })

        return {
            success: true,
            data: {
                transactions: payments.map(p => ({
                    id: p.id,
                    orderNumber: p.order.orderNumber,
                    amount: Number(p.amount),
                    status: p.status,
                    method: p.paymentMethod || "Unknown",
                    paidAt: p.paidAt?.toISOString() || null,
                    createdAt: p.createdAt.toISOString(),
                })),
                totalSpent: Number(totalSpent._sum.amount || 0),
            }
        }
    } catch (error) {
        console.error("Failed to get billing data:", error)
        return { success: false, error: "Gagal memuat data pembayaran" }
    }
}
