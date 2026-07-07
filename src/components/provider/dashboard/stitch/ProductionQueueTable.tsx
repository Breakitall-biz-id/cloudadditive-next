"use client"

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

export interface ProductionQueueItem {
    id: string
    orderId: string
    customer: string
    date: string
    material: string
    estimatedTime: string
    status: "urgent" | "printing" | "pending" | "completed"
    method?: string
    fleet?: string
}

interface ProductionQueueTableProps {
    items: ProductionQueueItem[]
    onReview?: (id: string) => void
    onAssign?: (id: string) => void
}

const statusConfig = {
    urgent: {
        label: "Urgent",
        bgColor: "bg-red-50",
        textColor: "text-red-600",
        icon: "priority_high",
        iconBg: "bg-red-50 text-red-500",
    },
    printing: {
        label: "Printing",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-600",
        icon: "print",
        iconBg: "bg-emerald-50 text-emerald-500",
    },
    pending: {
        label: "Pending",
        bgColor: "bg-slate-100",
        textColor: "text-slate-500",
        icon: "hourglass_empty",
        iconBg: "bg-slate-100 text-slate-500",
    },
    completed: {
        label: "Completed",
        bgColor: "bg-blue-50",
        textColor: "text-blue-600",
        icon: "check_circle",
        iconBg: "bg-blue-50 text-blue-500",
    },
}

export function ProductionQueueTable({ items, onReview, onAssign }: ProductionQueueTableProps) {

    const columns: ColumnDef<ProductionQueueItem>[] = [
        {
            accessorKey: "customer",
            header: "Order / Customer",
            cell: ({ row }) => {
                const item = row.original
                const config = statusConfig[item.status]
                return (
                    <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${config.iconBg}`}>
                            <span className="material-symbols-outlined text-xl">{config.icon}</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">{item.customer}</p>
                            <p className="text-[11px] text-slate-500 font-medium">#{item.orderId} • {item.date}</p>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: "material",
            header: "Details",
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div>
                        <p className="text-sm font-bold text-slate-900">{item.material}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Estimated {item.estimatedTime}</p>
                    </div>
                )
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const item = row.original
                const config = statusConfig[item.status]
                return (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bgColor} ${config.textColor}`}>
                        {config.label}
                    </span>
                )
            }
        },
        {
            accessorKey: "method",
            header: "Method",
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div>
                        <p className="text-sm font-medium text-slate-600">{item.method || "FDM / FFF"}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{item.fleet || "Desktop Fleet"}</p>
                    </div>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div className="text-right">
                        <button
                            onClick={() => item.status === "pending" || item.status === "urgent"
                                ? onReview?.(item.id)
                                : onAssign?.(item.id)
                            }
                            className="text-emerald-500 font-bold text-sm hover:underline"
                        >
                            {item.status === "printing" ? "View" : "Review"}
                        </button>
                    </div>
                )
            }
        }
    ]

    const emptyState = (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">inbox</span>
            <p className="text-slate-400 font-medium">No orders in queue</p>
            <p className="text-xs text-slate-400 mt-1">New orders will appear here</p>
        </div>
    )

    return (
        <section className="pb-12">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 card-shadow overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold">Active Production Queue</h3>
                </div>

                <DataTable
                    columns={columns}
                    data={items}
                    searchKey="customer"
                    placeholder="Search customer..."
                    emptyFullState={emptyState}
                />

                <div className="p-4 bg-slate-50/50 text-center border-t border-slate-100">
                    <Link
                        href="/provider/dashboard/orders"
                        className="text-xs font-bold text-slate-500 hover:text-primary uppercase tracking-widest"
                    >
                        View All Production Jobs
                    </Link>
                </div>
            </div>
        </section>
    )
}
