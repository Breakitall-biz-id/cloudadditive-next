"use client"

interface BillingTransaction {
    id: string
    orderNumber: string
    amount: number
    status: string
    method: string
    paidAt: string | null
    createdAt: string
}

interface BillingTabProps {
    transactions: BillingTransaction[]
    totalSpent: number
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })

export function BillingTab({ transactions, totalSpent }: BillingTabProps) {
    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Section Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-900">Pembayaran</h3>
                <p className="text-sm text-slate-500">Kelola metode pembayaran dan riwayat transaksi Anda.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Methods */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-lg">credit_card</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Metode Pembayaran</h4>
                    </div>

                    <div className="space-y-3">
                        {/* Bank Transfer */}
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-7 bg-primary rounded-md flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[16px]">account_balance</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Transfer Bank</p>
                                    <p className="text-xs text-slate-500">BCA, Mandiri, BNI, BRI</p>
                                </div>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                AKTIF
                            </span>
                        </div>

                        {/* E-Wallet */}
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[16px]">wallet</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">E-Wallet</p>
                                    <p className="text-xs text-slate-500">GoPay, OVO, DANA, ShopeePay</p>
                                </div>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                AKTIF
                            </span>
                        </div>

                        {/* QRIS */}
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-7 bg-violet-600 rounded-md flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[16px]">qr_code_2</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">QRIS</p>
                                    <p className="text-xs text-slate-500">Scan QR dari semua aplikasi</p>
                                </div>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                AKTIF
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-4 text-center italic">
                        Pembayaran diproses melalui Midtrans secara aman.
                    </p>
                </div>

                {/* Transaction History */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-600 text-lg">receipt_long</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">Riwayat Transaksi</h4>
                        </div>
                        <div className="text-xs font-bold text-slate-500">Total: {formatCurrency(totalSpent)}</div>
                    </div>

                    {transactions.length > 0 ? (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold">#{tx.orderNumber}</p>
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(tx.amount)}</p>
                                        <p className="text-[11px] text-slate-500">{tx.method}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">{formatDate(tx.paidAt || tx.createdAt)}</p>
                                        <span className={`inline-flex mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                            tx.status === "PAID" ? "bg-emerald-100 text-emerald-700" :
                                            tx.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                                            "bg-slate-100 text-slate-500"
                                        }`}>
                                            {tx.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-200 mb-3">receipt</span>
                            <p className="text-sm text-slate-400">Riwayat transaksi akan muncul di sini</p>
                            <p className="text-xs text-slate-300 mt-1">Setelah Anda melakukan pembayaran pertama</p>
                        </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 text-center italic">
                            Unduh riwayat lengkap untuk keperluan pencatatan.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
