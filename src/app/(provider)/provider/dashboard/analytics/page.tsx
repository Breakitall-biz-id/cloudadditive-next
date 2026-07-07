import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AnalyticsClient } from "./AnalyticsClient"

// Helper to format currency
function formatCurrency(amount: number): string {
    if (amount >= 1000000) {
        return `Rp ${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
        return `Rp ${(amount / 1000).toFixed(1)}K`
    }
    return `Rp ${amount.toLocaleString('id-ID')}`
}

export default async function ProviderAnalyticsPage() {
    const session = await auth()
    if (!session?.user?.id) return redirect("/login")

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        include: {
            printers: {
                include: { currentMaterial: true }
            }
        }
    })

    if (!provider) return redirect("/provider/register")
    if (!provider.isVerified) return redirect("/provider/dashboard")

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 6)
    const monthWindowStart = new Date(today)
    monthWindowStart.setDate(monthWindowStart.getDate() - 29)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1)

    const completedRecent = await prisma.order.findMany({
        where: {
            providerId: provider.id,
            status: "COMPLETED",
            printCompletedAt: { gte: monthWindowStart }
        },
        select: {
            printCompletedAt: true,
            createdAt: true,
            estimatedPrintTime: true,
            printerId: true,
            printer: { select: { name: true } }
        }
    })

    const weeklyBuckets = Array.from({ length: 7 }).map((_, idx) => {
        const day = new Date(weekStart)
        day.setDate(weekStart.getDate() + idx)
        return {
            label: day.toLocaleDateString("en-US", { weekday: "short" }),
            dateKey: day.toDateString(),
            completed: 0,
            printHours: 0,
        }
    })

    completedRecent.forEach(order => {
        const date = order.printCompletedAt || order.createdAt
        const key = date.toDateString()
        const bucket = weeklyBuckets.find(b => b.dateKey === key)
        if (bucket) {
            bucket.completed += 1
            if (order.estimatedPrintTime) {
                bucket.printHours += order.estimatedPrintTime / 60
            }
        }
    })

    const weeklyChartData = weeklyBuckets.map(b => ({
        label: b.label,
        completed: b.completed,
        printHours: Math.round(b.printHours)
    }))

    const dailyBuckets = [
        { label: "00-04", start: 0, end: 4, completed: 0, printHours: 0 },
        { label: "04-08", start: 4, end: 8, completed: 0, printHours: 0 },
        { label: "08-12", start: 8, end: 12, completed: 0, printHours: 0 },
        { label: "12-16", start: 12, end: 16, completed: 0, printHours: 0 },
        { label: "16-20", start: 16, end: 20, completed: 0, printHours: 0 },
        { label: "20-24", start: 20, end: 24, completed: 0, printHours: 0 },
    ]

    completedRecent.forEach(order => {
        const date = order.printCompletedAt || order.createdAt
        if (date >= today) {
            const hour = date.getHours()
            const bucket = dailyBuckets.find(b => hour >= b.start && hour < b.end)
            if (bucket) {
                bucket.completed += 1
                if (order.estimatedPrintTime) {
                    bucket.printHours += order.estimatedPrintTime / 60
                }
            }
        }
    })

    const dailyChartData = dailyBuckets.map(b => ({
        label: b.label,
        completed: b.completed,
        printHours: Math.round(b.printHours)
    }))

    const monthBuckets = Array.from({ length: 30 }).map((_, idx) => {
        const day = new Date(monthWindowStart)
        day.setDate(monthWindowStart.getDate() + idx)
        return {
            label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            dateKey: day.toDateString(),
            completed: 0,
            printHours: 0,
        }
    })

    completedRecent.forEach(order => {
        const date = order.printCompletedAt || order.createdAt
        const key = date.toDateString()
        const bucket = monthBuckets.find(b => b.dateKey === key)
        if (bucket) {
            bucket.completed += 1
            if (order.estimatedPrintTime) {
                bucket.printHours += order.estimatedPrintTime / 60
            }
        }
    })

    const monthlyChartData = monthBuckets.map(b => ({
        label: b.label,
        completed: b.completed,
        printHours: Math.round(b.printHours)
    }))

    const perPrinter: Record<string, { name: string; minutes: number }> = {}
    completedRecent.forEach(order => {
        if (!order.printerId) return
        const key = order.printerId
        const name = order.printer?.name || "Printer"
        if (!perPrinter[key]) perPrinter[key] = { name, minutes: 0 }
        perPrinter[key].minutes += order.estimatedPrintTime || 0
    })

    const printTimeFleets = Object.values(perPrinter)
        .map((p, idx) => ({
            name: p.name,
            avgHours: Number(((p.minutes / 60) / 30).toFixed(1)),
            maxHours: 24,
            color: (idx % 3 === 0 ? "teal" : idx % 3 === 1 ? "emerald" : "slate") as "teal" | "emerald" | "slate"
        }))
        .sort((a, b) => b.avgHours - a.avgHours)
        .slice(0, 4)

    const [totalRevenueData, currentMonthRevenueData, previousMonthRevenueData, totalCompleted] = await Promise.all([
        prisma.order.aggregate({
            where: { providerId: provider.id, status: "COMPLETED" },
            _sum: { printingCost: true }
        }),
        prisma.order.aggregate({
            where: { providerId: provider.id, status: "COMPLETED", printCompletedAt: { gte: monthStart } },
            _sum: { printingCost: true }
        }),
        prisma.order.aggregate({
            where: { providerId: provider.id, status: "COMPLETED", printCompletedAt: { gte: previousMonthStart, lt: previousMonthEnd } },
            _sum: { printingCost: true }
        }),
        prisma.order.count({
            where: { providerId: provider.id, status: "COMPLETED" }
        })
    ])

    const totalRevenue = Number(totalRevenueData._sum.printingCost || 0)
    const currentMonthRevenue = Number(currentMonthRevenueData._sum.printingCost || 0)
    const previousMonthRevenue = Number(previousMonthRevenueData._sum.printingCost || 0)
    const revenueChangeValue = previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : (currentMonthRevenue > 0 ? 100 : 0)
    const revenueChange = `${revenueChangeValue >= 0 ? "+" : ""}${revenueChangeValue.toFixed(0)}%`

    return (
        <AnalyticsClient
            chartData={{ weekly: weeklyChartData, daily: dailyChartData, monthly: monthlyChartData }}
            printTimeFleets={printTimeFleets}
            revenue={{
                totalRevenue: formatCurrency(totalRevenue),
                pendingPayout: formatCurrency(currentMonthRevenue),
                revenueChange,
                completedOrders: totalCompleted
            }}
        />
    )
}
