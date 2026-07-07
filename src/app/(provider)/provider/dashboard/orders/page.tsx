import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OrderManagementClient } from "./OrderManagementClient";

export default async function ProviderOrdersPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    // Get provider
    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    });

    if (!provider) {
        redirect("/provider/onboarding");
    }

    // Fetch orders with all necessary data
    const orders = await prisma.order.findMany({
        where: { providerId: provider.id },
        select: {
            id: true,
            orderNumber: true,
            status: true,
            stlFileName: true,
            quantity: true,
            totalPrice: true,
            estimatedPrintTime: true,
            createdAt: true,
            shippingAddress: true,
            trackingNumber: true,
            courierCode: true,
            shippedAt: true,
            gcodeFileUrl: true,
            printer: {
                select: { id: true, name: true },
            },
            user: {
                select: { name: true, email: true },
            },
            material: {
                select: { name: true },
            },
            quality: {
                select: { name: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Fetch printers for assignment dropdown
    const printers = await prisma.printer.findMany({
        where: { providerId: provider.id },
        select: {
            id: true,
            name: true,
            status: true,
            isAcceptingOrders: true,
            currentMaterialId: true,
            currentMaterial: {
                select: { name: true },
            },
        },
    });

    return (
        <OrderManagementClient
            orders={orders.map((o) => ({
                ...o,
                totalPrice: Number(o.totalPrice),
            }))}
            printers={printers}
        />
    );
}
