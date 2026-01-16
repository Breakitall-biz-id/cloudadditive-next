import midtransClient from 'midtrans-client'

// Midtrans Snap configuration
export const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
})

// Midtrans Core API (for notifications/status check)
export const coreApi = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
})

// Snap.js script URL
export const SNAP_SCRIPT_URL = process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'

export interface TransactionDetails {
    orderId: string
    grossAmount: number
    customerName: string
    customerEmail: string
    customerPhone: string
    items: Array<{
        id: string
        name: string
        price: number
        quantity: number
    }>
}

/**
 * Create Snap transaction token
 */
export async function createSnapTransaction(details: TransactionDetails) {
    const parameter = {
        transaction_details: {
            order_id: details.orderId,
            gross_amount: details.grossAmount,
        },
        customer_details: {
            first_name: details.customerName,
            email: details.customerEmail,
            phone: details.customerPhone,
        },
        item_details: details.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
        })),
        callbacks: {
            finish: `${process.env.NEXTAUTH_URL}/order/success`,
        },
    }

    const transaction = await snap.createTransaction(parameter)
    return {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
    }
}

/**
 * Verify notification signature from Midtrans webhook
 */
export function verifyNotificationSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
): boolean {
    const crypto = require('crypto')
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    const hash = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex')
    return hash === signatureKey
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(orderId: string) {
    return await coreApi.transaction.status(orderId)
}

// TypeScript types for Midtrans Snap window object
declare global {
    interface Window {
        snap?: {
            pay: (token: string, options?: {
                onSuccess?: (result: unknown) => void
                onPending?: (result: unknown) => void
                onError?: (result: unknown) => void
                onClose?: () => void
            }) => void
            embed: (token: string, options: {
                embedId: string
                onSuccess?: (result: unknown) => void
                onPending?: (result: unknown) => void
                onError?: (result: unknown) => void
            }) => void
        }
    }
}
