import { prisma } from '@/lib/prisma';
import {
    sendEmail,
    orderConfirmedCustomerEmail,
    newOrderProviderEmail,
    newOrderAdminEmail,
    ADMIN_EMAIL,
} from '@/lib/email';

/**
 * Send all notifications after payment success.
 * Called from webhook handler.
 */
export async function sendOrderNotifications(orderId: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                provider: { include: { user: true } },
                material: true,
            },
        });

        if (!order) {
            console.error(`[notifications] Order ${orderId} not found`);
            return;
        }

        const totalFormatted = Number(order.totalPrice).toLocaleString('id-ID');
        const results: { type: string; success: boolean; error?: string }[] = [];

        // 1. Customer email
        if (order.user.email) {
            const template = orderConfirmedCustomerEmail({
                customerName: order.user.name || 'Customer',
                orderNumber: order.orderNumber,
                totalPrice: totalFormatted,
                providerName: order.provider?.user?.name || 'CloudAdditive Provider',
            });
            const result = await sendEmail({
                to: order.user.email,
                ...template,
            });
            results.push({ type: 'customer', ...result });
        }

        // 2. Provider email
        if (order.provider?.user?.email) {
            const template = newOrderProviderEmail({
                providerName: order.provider.user.name || 'Provider',
                orderNumber: order.orderNumber,
                fileName: order.stlFileName,
                materialName: order.material.name,
                totalPrice: totalFormatted,
                customerName: order.user.name || 'Customer',
            });
            const result = await sendEmail({
                to: order.provider.user.email,
                ...template,
            });
            results.push({ type: 'provider', ...result });
        }

        // 3. Admin email
        const adminTemplate = newOrderAdminEmail({
            orderNumber: order.orderNumber,
            customerName: order.user.name || 'Customer',
            providerName: order.provider?.user?.name || 'Unassigned',
            totalPrice: totalFormatted,
        });
        const adminResult = await sendEmail({
            to: ADMIN_EMAIL,
            ...adminTemplate,
        });
        results.push({ type: 'admin', ...adminResult });

        console.log(`[notifications] Order ${order.orderNumber} emails sent:`,
            results.map(r => `${r.type}=${r.success}`).join(', '));

        return results;
    } catch (error) {
        console.error('[notifications] Failed to send notifications:', error);
    }
}
