"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const SubmitOrderReviewSchema = z.object({
    orderId: z.string().trim().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
})

export async function getCustomerActiveOrders() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, orders: [] }
    }

    try {
        const orders = await prisma.order.findMany({
            where: {
                userId: session.user.id,
                status: {
                    in: [
                        "PENDING_PAYMENT",
                        "PAYMENT_FAILED",
                        "CONFIRMED",
                        "IN_QUEUE",
                        "SLICING",
                        "PRINTING",
                        "POST_PROCESSING",
                        "PACKING",
                    ],
                },
            },
            include: {
                material: true,
                quality: true,
                printer: {
                    include: {
                        provider: true,
                    },
                },
            },
            orderBy: [
                // PENDING_PAYMENT first
                {
                    status: "asc",
                },
                {
                    createdAt: "desc",
                },
            ],
            take: 10, // Limit to 10 most recent active orders
        })

        // Sanitize ALL Decimal fields to fix serialization error
        const sanitizedOrders = orders.map(order => ({
            ...order,
            // Order Decimal fields
            printingCost: order.printingCost ? Number(order.printingCost) : null,
            shippingCost: order.shippingCost ? Number(order.shippingCost) : null,
            discount: order.discount ? Number(order.discount) : null,
            totalPrice: order.totalPrice ? Number(order.totalPrice) : null,
            filamentLengthMm: order.filamentLengthMm ? Number(order.filamentLengthMm) : null,
            filamentWeightG: order.filamentWeightG ? Number(order.filamentWeightG) : null,
            modelVolumeCm3: order.modelVolumeCm3 ? Number(order.modelVolumeCm3) : null,
            modelWidth: order.modelWidth ? Number(order.modelWidth) : null,
            modelHeight: order.modelHeight ? Number(order.modelHeight) : null,
            modelDepth: order.modelDepth ? Number(order.modelDepth) : null,
            shippingLat: order.shippingLat ? Number(order.shippingLat) : null,
            shippingLng: order.shippingLng ? Number(order.shippingLng) : null,

            // Material Decimal fields
            material: order.material ? {
                ...order.material,
                density: order.material.density ? Number(order.material.density) : null,
                diameter: order.material.diameter ? Number(order.material.diameter) : null,
                pricePerGram: order.material.pricePerGram ? Number(order.material.pricePerGram) : null,
                nozzleTemp: order.material.nozzleTemp ? Number(order.material.nozzleTemp) : null,
                bedTemp: order.material.bedTemp ? Number(order.material.bedTemp) : null,
            } : null,

            // Quality Decimal fields
            quality: order.quality ? {
                ...order.quality,
                layerHeight: order.quality.layerHeight ? Number(order.quality.layerHeight) : null,
                priceMultiplier: order.quality.priceMultiplier ? Number(order.quality.priceMultiplier) : null,
            } : null,
        }))

        return { success: true, orders: sanitizedOrders }
    } catch (error) {
        console.error("Failed to get customer active orders:", error)
        return { success: false, orders: [] }
    }
}

export async function getOrderDetail(orderId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId: session.user.id,
            },
            include: {
                material: true,
                quality: true,
                printer: {
                    include: {
                        provider: true,
                    },
                },
                statusHistory: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 5,
                },
                payment: true,
            },
        })

        if (!order) {
            return { success: false, error: "Order not found" }
        }

        // Sanitize ALL Decimal fields to fix serialization error
        // Updated: 2026-02-14 - comprehensive sanitization
        const sanitizedOrder = {
            ...order,
            // Order Decimal fields
            printingCost: order.printingCost ? Number(order.printingCost) : null,
            shippingCost: order.shippingCost ? Number(order.shippingCost) : null,
            discount: order.discount ? Number(order.discount) : null,
            totalPrice: order.totalPrice ? Number(order.totalPrice) : null,
            filamentLengthMm: order.filamentLengthMm ? Number(order.filamentLengthMm) : null,
            filamentWeightG: order.filamentWeightG ? Number(order.filamentWeightG) : null,
            modelVolumeCm3: order.modelVolumeCm3 ? Number(order.modelVolumeCm3) : null,
            modelWidth: order.modelWidth ? Number(order.modelWidth) : null,
            modelHeight: order.modelHeight ? Number(order.modelHeight) : null,
            modelDepth: order.modelDepth ? Number(order.modelDepth) : null,
            shippingLat: order.shippingLat ? Number(order.shippingLat) : null,
            shippingLng: order.shippingLng ? Number(order.shippingLng) : null,

            // Material Decimal fields
            material: order.material ? {
                ...order.material,
                density: order.material.density ? Number(order.material.density) : null,
                diameter: order.material.diameter ? Number(order.material.diameter) : null,
                pricePerGram: order.material.pricePerGram ? Number(order.material.pricePerGram) : null,
                nozzleTemp: order.material.nozzleTemp ? Number(order.material.nozzleTemp) : null,
                bedTemp: order.material.bedTemp ? Number(order.material.bedTemp) : null,
            } : null,

            // Quality Decimal fields
            quality: order.quality ? {
                ...order.quality,
                layerHeight: order.quality.layerHeight ? Number(order.quality.layerHeight) : null,
                priceMultiplier: order.quality.priceMultiplier ? Number(order.quality.priceMultiplier) : null,
            } : null,


            // Payment Decimal fields
            payment: order.payment ? {
                ...order.payment,
                amount: order.payment.amount ? Number(order.payment.amount) : null,
            } : null,

            // Include snapToken from payment if available
            snapToken: order.payment?.snapToken || null,
            snapUrl: order.payment?.snapUrl || null,
        }

        return { success: true, order: sanitizedOrder }
    } catch (error) {
        console.error("Failed to get order detail:", error)
        return { success: false, error: "Failed to load order details" }
    }
}

export async function confirmOrderReceived(orderId: string): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId: session.user.id,
            },
            select: {
                id: true,
                status: true,
                deliveredAt: true,
            },
        })

        if (!order) {
            return { success: false, error: "Order not found" }
        }

        if (order.status !== "SHIPPED" && order.status !== "DELIVERED") {
            return { success: false, error: "Order belum bisa dikonfirmasi diterima" }
        }

        await prisma.$transaction([
            prisma.order.update({
                where: { id: order.id },
                data: {
                    status: "COMPLETED",
                    deliveredAt: order.deliveredAt || new Date(),
                },
            }),
            prisma.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    status: "COMPLETED",
                    note: "Pesanan diterima dan dikonfirmasi oleh customer",
                    changedBy: session.user.id,
                },
            }),
        ])

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/orders")

        return { success: true }
    } catch (error) {
        console.error("Failed to confirm order received:", error)
        return { success: false, error: "Gagal mengonfirmasi pesanan diterima" }
    }
}

export async function submitOrderReview(input: {
    orderId: string
    rating: number
    comment?: string
}): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" }
    }

    const parsed = SubmitOrderReviewSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: "Review tidak valid" }
    }

    const { orderId, rating, comment } = parsed.data

    try {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId: session.user.id,
            },
            select: {
                id: true,
                status: true,
                providerId: true,
                printerId: true,
                review: { select: { id: true } },
            },
        })

        if (!order) {
            return { success: false, error: "Order not found" }
        }

        if (order.status !== "COMPLETED") {
            return { success: false, error: "Review hanya bisa diberikan setelah pesanan selesai" }
        }

        if (order.review) {
            return { success: false, error: "Pesanan ini sudah direview" }
        }

        await prisma.orderReview.create({
            data: {
                orderId: order.id,
                userId: session.user.id,
                providerId: order.providerId,
                printerId: order.printerId,
                rating,
                comment: comment || null,
            },
        })

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/orders")

        return { success: true }
    } catch (error) {
        console.error("Failed to submit order review:", error)
        return { success: false, error: "Gagal menyimpan review" }
    }
}
