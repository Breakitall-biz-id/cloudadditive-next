"use client"

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface OrderHistoryItem {
    id: string
    date: string
    project: string
    status: string
    total: string
    statusColor: string
}

const columns: ColumnDef<OrderHistoryItem>[] = [
    {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => <span className="font-mono font-bold text-primary group-hover:text-primary/80 transition-colors">{row.getValue("id")}</span>
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => <span className="text-slate-500">{row.getValue("date")}</span>
    },
    {
        accessorKey: "project",
        header: "Project Name",
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.getValue("project")}</span>
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.original.statusColor}`}>
                {row.getValue("status")}
            </span>
        )
    },
    {
        accessorKey: "total",
        header: () => <div className="text-right">Total (Rp)</div>,
        cell: ({ row }) => <div className="text-right font-mono font-bold text-slate-900">{row.getValue("total")}</div>
    }
]

interface OrderHistoryProps {
    items: OrderHistoryItem[]
}

export function OrderHistory({ items }: OrderHistoryProps) {
    return (
        <section>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Order History</h2>
            <DataTable
                columns={columns}
                data={items}
                searchKey="project"
                placeholder="Search orders..."
            />
        </section>
    )
}
