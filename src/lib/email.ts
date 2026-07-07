import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
let resend: Resend | null = null;

function getResendClient() {
    if (!RESEND_API_KEY) return null;
    if (!resend) {
        resend = new Resend(RESEND_API_KEY);
    }
    return resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'CloudAdditive <noreply@cloudadditive.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cloudadditive.com';

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
}

export async function sendEmail(options: EmailOptions) {
    try {
        const client = getResendClient();
        if (!client) {
            return { success: false, error: "Missing RESEND_API_KEY" };
        }

        const { data, error } = await client.emails.send({
            from: FROM_EMAIL,
            to: Array.isArray(options.to) ? options.to : [options.to],
            subject: options.subject,
            html: options.html,
        });

        if (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (err) {
        console.error('Email send exception:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

// ─── Email Templates ─────────────────────────────────────────

export function orderConfirmedCustomerEmail(data: {
    customerName: string;
    orderNumber: string;
    totalPrice: string;
    providerName: string;
}) {
    return {
        subject: `✅ Order ${data.orderNumber} Confirmed - CloudAdditive`,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">✅ Payment Confirmed</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 16px;">Hi <strong>${data.customerName}</strong>,</p>
                <p style="color: #64748b;">Your payment has been confirmed! Your 3D print order is now being processed.</p>
                
                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="color: #64748b; padding: 6px 0;">Order Number</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${data.orderNumber}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Total</td><td style="text-align: right; font-weight: bold; color: #f97316;">Rp ${data.totalPrice}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Provider</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${data.providerName}</td></tr>
                    </table>
                </div>
                
                <p style="color: #64748b; font-size: 14px;">You'll receive updates as your order progresses. Thank you for using CloudAdditive!</p>
            </div>
        </div>`,
    };
}

export function newOrderProviderEmail(data: {
    providerName: string;
    orderNumber: string;
    fileName: string;
    materialName: string;
    totalPrice: string;
    customerName: string;
}) {
    return {
        subject: `🆕 New Order ${data.orderNumber} Assigned - CloudAdditive`,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🆕 New Order Assigned</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 16px;">Hi <strong>${data.providerName}</strong>,</p>
                <p style="color: #64748b;">A new print order has been assigned to you.</p>
                
                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="color: #64748b; padding: 6px 0;">Order</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${data.orderNumber}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">File</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${data.fileName}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Material</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${data.materialName}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Customer</td><td style="text-align: right; font-weight: bold; color: #0f172a;">${data.customerName}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Total</td><td style="text-align: right; font-weight: bold; color: #16a34a;">Rp ${data.totalPrice}</td></tr>
                    </table>
                </div>
                
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudadditive.com'}/provider/dashboard/orders" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
                    View Order Details
                </a>
            </div>
        </div>`,
    };
}

export function newOrderAdminEmail(data: {
    orderNumber: string;
    customerName: string;
    providerName: string;
    totalPrice: string;
}) {
    return {
        subject: `📋 New Order ${data.orderNumber} - CloudAdditive Admin`,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">📋 New Order Placed</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="color: #64748b; padding: 6px 0;">Order</td><td style="text-align: right; font-weight: bold;">${data.orderNumber}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Customer</td><td style="text-align: right; font-weight: bold;">${data.customerName}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Provider</td><td style="text-align: right; font-weight: bold;">${data.providerName}</td></tr>
                        <tr><td style="color: #64748b; padding: 6px 0;">Total</td><td style="text-align: right; font-weight: bold; color: #16a34a;">Rp ${data.totalPrice}</td></tr>
                    </table>
                </div>
            </div>
        </div>`,
    };
}

export { ADMIN_EMAIL };
