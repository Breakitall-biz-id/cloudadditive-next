"use client"

interface IncomeExpenseCardsProps {
    income: string
    incomeChange: string
    expenses: string
    expensesChange: string
}

export function IncomeExpenseCards({
    income = "Rp 12.378k",
    incomeChange = "+45.0%",
    expenses = "Rp 5.788k",
    expensesChange = "-12.5%"
}: IncomeExpenseCardsProps) {
    return (
        <div className="flex flex-col gap-4">
            {/* Income Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow flex-1 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-[#004D4D]/5 flex items-center justify-center text-[#004D4D]">
                    <span className="material-symbols-outlined filled">call_received</span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Income</p>
                    <div className="flex items-center gap-2">
                        <h4 className="text-2xl font-bold">{income}</h4>
                        <span className={`text-[10px] font-bold ${incomeChange.startsWith("+") ? "text-emerald-500" : "text-red-500"
                            }`}>
                            {incomeChange} {incomeChange.startsWith("+") ? "↗" : "↘"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Expenses Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow flex-1 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-outlined">call_made</span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expenses</p>
                    <div className="flex items-center gap-2">
                        <h4 className="text-2xl font-bold">{expenses}</h4>
                        <span className={`text-[10px] font-bold ${expensesChange.startsWith("-") ? "text-emerald-500" : "text-red-500"
                            }`}>
                            {expensesChange.replace("-", "")} {expensesChange.startsWith("-") ? "↘" : "↗"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
