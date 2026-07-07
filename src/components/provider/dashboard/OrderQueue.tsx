"use client"

import { ShoppingCart, Filter, FileDown } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"

interface Order {
    id: string
    orderId: string
    customer: string
    priority: "urgent" | "normal" | "low"
    material: string
    etd: string
    actionLabel?: string
}

interface OrderQueueProps {
    orders: Order[]
    onFilter?: () => void
    onExport?: () => void
    onOrderAction?: (orderId: string) => void
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

export function OrderQueue({
    orders,
    onFilter,
    onExport,
    onOrderAction
}: OrderQueueProps) {

    const columns: ColumnDef<Order>[] = [
        {
            accessorKey: "orderId",
            header: "Order ID",
            cell: ({ row }) => <span className="font-bold text-sm">{row.getValue("orderId")}</span>
        },
        {
            accessorKey: "customer",
            header: "Customer",
            cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("customer")}</span>
        },
        {
            accessorKey: "priority",
            header: "Priority",
            cell: ({ row }) => {
                const priority = row.original.priority
                const config = priorityConfig[priority]
                return (
                    <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full 
                        text-[10px] font-bold uppercase
                        ${config.bg} ${config.text}
                    `}>
                        {priority}
                    </span>
                )
            }
        },
        {
            accessorKey: "material",
            header: "Material",
            cell: ({ row }) => <span className="text-sm text-slate-500">{row.getValue("material")}</span>
        },
        {
            accessorKey: "etd",
            header: "ETD",
            cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("etd")}</span>
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <button
                    onClick={() => onOrderAction?.(row.original.id)}
                    className="text-primary hover:text-primary/80 font-bold text-sm"
                >
                    {row.original.actionLabel || "Review"}
                </button>
            )
        }
    ]

    return (
        <div className="space-y-4 pb-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Active Production Queue
                </h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onFilter}
                        className="gap-2"
                    >
                        <Filter className="w-4 h-4" /> Filter
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        className="gap-2"
                    >
                        <FileDown className="w-4 h-4" /> Export
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={orders}
                searchKey="customer"
                placeholder="Search customer..."
            />
        </div>
    )
}
