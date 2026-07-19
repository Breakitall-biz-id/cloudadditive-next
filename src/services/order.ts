
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"

export const OrderService = {
    /**
     * Get all orders for a specific user.
     */
    async getUserOrders(userId: string) {
        return await prisma.order.findMany({
            where: {
                userId: userId,
            },
            include: {
                material: true,
                quality: true,
                provider: {
                    select: {
                        id: true,
                        businessName: true,
                    }
                },
                review: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
    },

    /**
     * Get a single active order for tracking (the most recent non-final order).
     */
    async getActiveOrder(userId: string) {
        return await prisma.order.findFirst({
            where: {
                userId: userId,
                status: {
                    notIn: [
                        OrderStatus.COMPLETED,
                        OrderStatus.CANCELLED,
                        OrderStatus.REFUNDED,
                        OrderStatus.PAYMENT_FAILED // Maybe failed is not active?
                    ]
                }
            },
            include: {
                material: true,
                quality: true,
                provider: true, // Need provider details for active tracking
                review: true,
                statusHistory: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        })
    },

    /**
     * Get order statistics for the dashboard.
     */
    async getOrderStats(userId: string) {
        const [totalOrders, activeOrders, completedOrders, totalSpent] = await Promise.all([
            prisma.order.count({
                where: { userId }
            }),
            prisma.order.count({
                where: {
                    userId,
                    status: {
                        in: [
                            OrderStatus.CONFIRMED,
                            OrderStatus.IN_QUEUE,
                            OrderStatus.SLICING,
                            OrderStatus.PRINTING,
                            OrderStatus.POST_PROCESSING,
                            OrderStatus.PACKING,
                            OrderStatus.SHIPPED,
                            OrderStatus.DELIVERED,
                        ]
                    }
                }
            }),
            prisma.order.count({
                where: {
                    userId,
                    status: {
                        in: [OrderStatus.COMPLETED]
                    }
                }
            }),
            prisma.order.aggregate({
                where: {
                    userId,
                    status: {
                        in: [OrderStatus.COMPLETED]
                    }
                },
                _sum: {
                    totalPrice: true
                }
            })
        ])

        return {
            total: totalOrders,
            active: activeOrders,
            completed: completedOrders,
            totalSpent: Number(totalSpent._sum.totalPrice || 0),
        }
    }
}
