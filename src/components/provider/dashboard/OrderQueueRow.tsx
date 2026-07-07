"use client"

interface OrderQueueRowProps {
    orderId: string
    customer: string
    priority: "urgent" | "normal" | "low"
    material: string
    etd: string
    actionLabel?: string
    onAction?: () => void
}

const priorityConfig: Record<string, { bg: string, text: string }> = {
    urgent: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400"
    },
    normal: {
        bg: "bg-primary/10",
        text: "text-primary"
    },
    low: {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-600 dark:text-slate-400"
    }
}

export function OrderQueueRow({
    orderId,
    customer,
    priority,
    material,
    etd,
    actionLabel = "Review",
    onAction
}: OrderQueueRowProps) {
    const config = priorityConfig[priority]

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td className="px-6 py-4 font-bold text-sm">{orderId}</td>
            <td className="px-6 py-4 text-sm font-medium">{customer}</td>
            <td className="px-6 py-4">
                <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full 
                    text-[10px] font-bold uppercase
                    ${config.bg} ${config.text}
                `}>
                    {priority}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">{material}</td>
            <td className="px-6 py-4 text-sm font-medium">{etd}</td>
            <td className="px-6 py-4">
                <button
                    onClick={onAction}
                    className="text-primary hover:text-primary/80 font-bold text-sm"
                >
                    {actionLabel}
                </button>
            </td>
        </tr>
    )
}
