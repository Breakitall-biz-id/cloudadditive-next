"use client"

import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"

interface StepPaymentProps {
    wizard: UseOrderWizardReturn
}

const PAYMENT_METHODS = [
    { id: "gopay", name: "GoPay", icon: "account_balance_wallet", color: "#00AED6" },
    { id: "ovo", name: "OVO", icon: "account_balance_wallet", color: "#4C3494" },
    { id: "dana", name: "DANA", icon: "account_balance_wallet", color: "#108EE9" },
    { id: "va", name: "Virtual Account", icon: "account_balance", color: "#1A1A1A" },
    { id: "qris", name: "QRIS", icon: "qr_code_2", color: "#E31E52" },
]

export function StepPayment({ wizard }: StepPaymentProps) {
    const { computed } = wizard

    return (
        <>
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">06 Payment</h2>
                <p className="text-slate-500 max-w-xl">
                    Select your preferred payment method to complete the order.
                </p>
            </div>

            {/* Payment Methods */}
            <div className="flex flex-col gap-3">
                {PAYMENT_METHODS.map((method) => (
                    <button
                        key={method.id}
                        className="bg-white rounded-xl p-5 border-2 border-slate-200 hover:border-slate-300 flex items-center justify-between transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="size-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${method.color}20` }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ color: method.color }}
                                >
                                    {method.icon}
                                </span>
                            </div>
                            <p className="font-bold text-slate-900">{method.name}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </button>
                ))}
            </div>

            {/* Total */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total Payment</span>
                    <span className="text-2xl font-black text-primary">Rp {computed.total.toLocaleString()}</span>
                </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <span className="material-symbols-outlined text-emerald-500">verified_user</span>
                <span>Secured by Midtrans</span>
            </div>
        </>
    )
}
