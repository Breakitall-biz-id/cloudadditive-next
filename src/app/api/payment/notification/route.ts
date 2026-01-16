import { NextRequest, NextResponse } from 'next/server'
import { verifyNotificationSignature, getTransactionStatus } from '@/lib/midtrans'

// Disable body parsing for webhook
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            order_id: orderId,
            status_code: statusCode,
            gross_amount: grossAmount,
            signature_key: signatureKey,
            transaction_status: transactionStatus,
            fraud_status: fraudStatus,
            payment_type: paymentType,
        } = body

        console.log('Midtrans notification received:', {
            orderId,
            transactionStatus,
            paymentType,
        })

        // Verify signature
        const isValid = verifyNotificationSignature(
            orderId,
            statusCode,
            grossAmount,
            signatureKey
        )

        if (!isValid) {
            console.error('Invalid signature for order:', orderId)
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 403 }
            )
        }

        // Double-check status with Midtrans API
        const status = await getTransactionStatus(orderId)

        // Handle different transaction statuses
        let orderStatus: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed'

        if (status.transaction_status === 'capture') {
            // Credit card with capture
            orderStatus = status.fraud_status === 'accept' ? 'paid' : 'pending'
        } else if (status.transaction_status === 'settlement') {
            // Payment completed
            orderStatus = 'paid'
        } else if (status.transaction_status === 'pending') {
            // Payment initiated but not completed
            orderStatus = 'pending'
        } else if (status.transaction_status === 'expire') {
            orderStatus = 'expired'
        } else if (status.transaction_status === 'cancel' || status.transaction_status === 'deny') {
            orderStatus = 'cancelled'
        } else {
            orderStatus = 'failed'
        }

        console.log(`Order ${orderId} status updated to: ${orderStatus}`)

        // TODO: Update order in database
        // await prisma.order.update({
        //     where: { orderId },
        //     data: { 
        //         paymentStatus: orderStatus,
        //         paymentMethod: paymentType,
        //         paidAt: orderStatus === 'paid' ? new Date() : null,
        //     }
        // })

        // TODO: Send notification to user
        // if (orderStatus === 'paid') {
        //     await sendPaymentConfirmationEmail(orderId)
        // }

        return NextResponse.json({
            success: true,
            orderId,
            status: orderStatus,
        })

    } catch (error) {
        console.error('Notification handling error:', error)
        return NextResponse.json(
            { error: 'Failed to process notification' },
            { status: 500 }
        )
    }
}

// Allow GET for webhook verification
export async function GET() {
    return NextResponse.json({ status: 'Webhook endpoint active' })
}
