"use client"

import { useState, useEffect } from "react"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"
import Script from "next/script"

interface StepPaymentProps {
    wizard: UseOrderWizardReturn
}

export function StepPayment({ wizard }: StepPaymentProps) {
    const { computed, state } = wizard
    const [isLoading, setIsLoading] = useState(false)
    const [snapReady, setSnapReady] = useState(false)
    const [paymentError, setPaymentError] = useState<string | null>(null)

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
    const snapScriptUrl = process.env.MIDTRANS_IS_PRODUCTION === 'true'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'

    const handlePayNow = async () => {
        if (!snapReady) {
            setPaymentError('Payment system is loading, please wait...')
            return
        }

        setIsLoading(true)
        setPaymentError(null)

        try {
            // Create payment transaction
            const response = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: computed.total,
                    customerName: state.recipientName,
                    customerEmail: 'customer@example.com', // TODO: get from auth
                    customerPhone: state.recipientPhone,
                    items: [
                        {
                            id: 'print-material',
                            name: `3D Print - ${state.selectedMaterial?.toUpperCase() || 'PLA'}`,
                            price: computed.materialCost,
                            quantity: state.quantity,
                        },
                        {
                            id: 'print-time',
                            name: 'Machine Time',
                            price: computed.timeCost,
                            quantity: 1,
                        },
                        {
                            id: 'provider-fee',
                            name: 'Provider Fee',
                            price: computed.markup,
                            quantity: 1,
                        },
                        {
                            id: 'platform-fee',
                            name: 'Platform Fee',
                            price: computed.platformFee,
                            quantity: 1,
                        },
                        {
                            id: 'shipping',
                            name: 'Shipping Cost',
                            price: computed.shippingCost,
                            quantity: 1,
                        },
                    ].filter(item => item.price > 0),
                }),
            })

            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to create payment')
            }

            // Open Snap payment popup
            window.snap?.pay(data.token, {
                onSuccess: (result) => {
                    console.log('Payment success:', result)
                    // TODO: Navigate to success page
                    window.location.href = '/order/success?order_id=' + data.orderId
                },
                onPending: (result) => {
                    console.log('Payment pending:', result)
                    // TODO: Navigate to pending page
                    window.location.href = '/order/pending?order_id=' + data.orderId
                },
                onError: (result) => {
                    console.error('Payment error:', result)
                    setPaymentError('Payment failed. Please try again.')
                },
                onClose: () => {
                    console.log('Payment popup closed')
                    setIsLoading(false)
                },
            })

        } catch (error) {
            console.error('Payment error:', error)
            setPaymentError(error instanceof Error ? error.message : 'Payment failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Load Midtrans Snap.js */}
            <Script
                src={snapScriptUrl}
                data-client-key={clientKey}
                onLoad={() => setSnapReady(true)}
                onError={() => setPaymentError('Failed to load payment system')}
            />

            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">06 Payment</h2>
                <p className="text-slate-500 max-w-xl">
                    Complete your order by making a payment. Choose your preferred payment method.
                </p>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Order Summary</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Material Cost</span>
                        <span className="font-bold text-slate-900">Rp {computed.materialCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Machine Time</span>
                        <span className="font-bold text-slate-900">Rp {computed.timeCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Provider Fee</span>
                        <span className="font-bold text-slate-900">Rp {computed.markup.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Platform Fee</span>
                        <span className="font-bold text-slate-900">Rp {computed.platformFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Shipping</span>
                        <span className="font-bold text-slate-900">Rp {computed.shippingCost.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-1">
                        <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Total</span>
                            <span className="text-xl font-black text-primary">Rp {computed.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Methods Info */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-slate-500">payments</span>
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 mb-1">Available Payment Methods</p>
                        <p className="text-sm text-slate-500">
                            GoPay, OVO, DANA, ShopeePay, QRIS, Bank Transfer (BCA, BNI, Mandiri, BRI), Credit/Debit Card
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <p className="text-sm text-red-600">{paymentError}</p>
                </div>
            )}

            {/* Pay Now Button */}
            <button
                onClick={handlePayNow}
                disabled={isLoading || !snapReady || computed.total <= 0}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${isLoading || !snapReady || computed.total <= 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]'
                    }`}
            >
                {isLoading ? (
                    <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        <span>Processing...</span>
                    </>
                ) : !snapReady ? (
                    <>
                        <span className="material-symbols-outlined animate-pulse">hourglass_empty</span>
                        <span>Loading Payment...</span>
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined">lock</span>
                        <span>Pay Now - Rp {computed.total.toLocaleString()}</span>
                    </>
                )}
            </button>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <span className="material-symbols-outlined text-emerald-500">verified_user</span>
                <span>Secured by Midtrans</span>
            </div>
        </>
    )
}
