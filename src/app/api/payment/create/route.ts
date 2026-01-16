import { NextRequest, NextResponse } from 'next/server'
import { createSnapTransaction } from '@/lib/midtrans'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            amount,
            customerName,
            customerEmail,
            customerPhone,
            items,
        } = body

        if (!amount || !customerName || !customerEmail) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Generate unique order ID
        const orderId = `ORDER-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`

        // Create Snap transaction
        const transaction = await createSnapTransaction({
            orderId,
            grossAmount: Math.round(amount),
            customerName,
            customerEmail,
            customerPhone: customerPhone || '',
            items: items || [{
                id: 'print-order',
                name: '3D Print Order',
                price: Math.round(amount),
                quantity: 1,
            }],
        })

        return NextResponse.json({
            success: true,
            orderId,
            token: transaction.token,
            redirectUrl: transaction.redirectUrl,
        })

    } catch (error) {
        console.error('Payment creation error:', error)
        return NextResponse.json(
            { error: 'Failed to create payment' },
            { status: 500 }
        )
    }
}
