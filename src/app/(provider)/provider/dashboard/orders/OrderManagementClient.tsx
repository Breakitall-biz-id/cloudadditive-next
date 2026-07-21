"use client";

import { useState, useMemo } from "react";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatus, updateShippingInfo, manualAssignOrder, startPrintViaPlugin, bulkAssignOrders, bulkUpdateOrderStatus, bulkAdvanceOrderStatus } from "@/actions/provider-order";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import type { RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { formatCourierLabel } from "@/lib/order-shipping";

interface Order {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    stlFileName: string;
    quantity: number;
    totalPrice: number;
    estimatedPrintTime: number | null;
    createdAt: Date;
    shippingAddress: string;
    trackingNumber: string | null;
    courierCode: string | null;
    courierService: string | null;
    shippedAt: Date | null;
    gcodeFileUrl: string | null;
    printer: { id: string; name: string } | null;
    user: { name: string | null; email: string | null };
    material: { name: string } | null;
    quality: { name: string } | null;
}

interface Printer {
    id: string;
    name: string;
    status: string;
    isAcceptingOrders: boolean;
    currentMaterialId: string | null;
    currentMaterial: { name: string } | null;
}

interface Props {
    orders: Order[];
    printers: Printer[];
}

type TabKey = "all" | "queue" | "printing" | "ready" | "shipped" | "completed";

// Using actual OrderStatus enum values from schema
const TABS: { key: TabKey; label: string; statuses: OrderStatus[] }[] = [
    { key: "all", label: "All", statuses: [] },
    { key: "queue", label: "Queue", statuses: ["CONFIRMED", "IN_QUEUE", "SLICING"] },
    { key: "printing", label: "Printing", statuses: ["PRINTING", "POST_PROCESSING"] },
    { key: "ready", label: "Ready", statuses: ["PACKING"] },
    { key: "shipped", label: "Shipped", statuses: ["SHIPPED"] },
    { key: "completed", label: "Completed", statuses: ["DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"] },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "bg-yellow-100 text-yellow-700 border-yellow-200",
    PAYMENT_FAILED: "bg-red-100 text-red-700 border-red-200",
    CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
    IN_QUEUE: "bg-indigo-100 text-indigo-700 border-indigo-200",
    SLICING: "bg-purple-100 text-purple-700 border-purple-200",
    PRINTING: "bg-teal-100 text-teal-700 border-teal-200",
    POST_PROCESSING: "bg-orange-100 text-orange-700 border-orange-200",
    PACKING: "bg-green-100 text-green-700 border-green-200",
    SHIPPED: "bg-sky-100 text-sky-700 border-sky-200",
    DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
    REFUNDED: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "Pending Payment",
    PAYMENT_FAILED: "Payment Failed",
    CONFIRMED: "Confirmed",
    IN_QUEUE: "In Queue",
    SLICING: "Slicing",
    PRINTING: "Printing",
    POST_PROCESSING: "Post Processing",
    PACKING: "Packing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
};

export function OrderManagementClient({ orders, printers }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [bulkPrinterId, setBulkPrinterId] = useState("");
    const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");
    const [filterPrinter, setFilterPrinter] = useState("");
    const [filterMaterial, setFilterMaterial] = useState("");
    const [filterFromDate, setFilterFromDate] = useState("");
    const [filterToDate, setFilterToDate] = useState("");
    const [confirmAction, setConfirmAction] = useState<null | "assign" | "update" | "advance" | "export">(null);

    const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
        setIsLoading(true);
        const result = await updateOrderStatus(orderId, newStatus);
        if (!result.success) {
            toast.error(result.error || "Failed to update status");
        } else {
            toast.success("Status updated");
        }
        setIsLoading(false);
    };

    const handleShipOrder = async () => {
        if (!selectedOrder || !trackingNumber.trim()) return;
        setIsLoading(true);
        const result = await updateShippingInfo(selectedOrder.id, trackingNumber);
        if (result.success) {
            setShowShippingModal(false);
            setTrackingNumber("");
            setSelectedOrder(null);
            toast.success("Tracking info saved");
        } else {
            toast.error(result.error || "Failed to input tracking number");
        }
        setIsLoading(false);
    };

    const handleAssignPrinter = async (orderId: string, printerId: string) => {
        setIsLoading(true);
        const result = await manualAssignOrder(orderId, printerId);
        if (!result.success) {
            toast.error(result.error || "Failed to assign printer");
        } else {
            toast.success("Printer assigned");
        }
        setIsLoading(false);
    };

    const handleStartPrint = async (orderId: string) => {
        setIsLoading(true);
        const result = await startPrintViaPlugin(orderId);
        if (!result.success) {
            toast.error(result.error || "Failed to start print");
        } else {
            toast.success(result.message || "Print started");
        }
        setIsLoading(false);
    };

    const formatTime = (minutes: number | null) => {
        if (!minutes) return "-";
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    };

    const extractCity = (address: string) => {
        const parts = address.split(",");
        return parts.length > 1 ? parts[1].trim() : parts[0].trim().substring(0, 20);
    };

    const filteredOrders = useMemo(() => {
        const tab = TABS.find((t) => t.key === activeTab);
        let result = orders;
        if (tab && tab.statuses.length > 0) {
            result = result.filter((o) => tab.statuses.includes(o.status));
        }

        if (filterPrinter) {
            result = result.filter((o) => o.printer?.id === filterPrinter);
        }

        if (filterMaterial) {
            result = result.filter((o) => o.material?.name === filterMaterial);
        }

        if (filterFromDate) {
            const from = new Date(filterFromDate);
            result = result.filter((o) => new Date(o.createdAt) >= from);
        }

        if (filterToDate) {
            const to = new Date(filterToDate);
            to.setHours(23, 59, 59, 999);
            result = result.filter((o) => new Date(o.createdAt) <= to);
        }

        return result;
    }, [orders, activeTab, filterPrinter, filterMaterial, filterFromDate, filterToDate]);

    const orderCounts = useMemo(() => {
        const counts: Record<TabKey, number> = {
            all: orders.length,
            queue: 0,
            printing: 0,
            ready: 0,
            shipped: 0,
            completed: 0,
        };
        orders.forEach((o) => {
            TABS.forEach((t) => {
                if (t.statuses.includes(o.status)) counts[t.key]++;
            });
        });
        return counts;
    }, [orders]);

    const columns: ColumnDef<Order>[] = [
        {
            accessorKey: "stlFileName",
            header: "Order",
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div>
                        <p className="font-semibold text-sm text-slate-900">{order.stlFileName}</p>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">{order.quantity}x</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{formatPrice(order.totalPrice)}</span>
                        </p>
                    </div>
                );
            },
        },
        {
            accessorKey: "user.name",
            header: "Customer",
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div>
                        <p className="text-sm font-medium text-slate-800">{order.user?.name || "-"}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[10px] align-middle">location_on</span>
                            {extractCity(order.shippingAddress)}
                        </p>
                    </div>
                );
            },
        },
        {
            accessorKey: "material.name",
            header: "Material",
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div className="text-sm">
                        <p className="font-medium text-slate-700">{order.material?.name || "-"}</p>
                        <p className="text-xs text-slate-400">{order.quality?.name || "-"}</p>
                    </div>
                );
            },
        },
        {
            accessorKey: "printer",
            header: "Printer",
            cell: ({ row }) => {
                const order = row.original;
                if (order.printer) {
                    return (
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-sm font-medium text-slate-700">{order.printer.name}</span>
                        </div>
                    )
                }
                return (
                    <select
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors w-full max-w-[140px]"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) handleAssignPrinter(order.id, e.target.value);
                        }}
                        disabled={isLoading}
                    >
                        <option value="">Select Printer</option>
                        {printers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} {p.currentMaterial ? `(${p.currentMaterial.name})` : ""}
                            </option>
                        ))}
                    </select>
                );
            },
        },
        {
            accessorKey: "estimatedPrintTime",
            header: "Est. Print",
            cell: ({ row }) => <span className="text-sm text-slate-600 font-mono">{formatTime(row.original.estimatedPrintTime)}</span>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[row.original.status]}`}
                >
                    {STATUS_LABELS[row.original.status]}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div className="flex gap-2">
                        {(order.status === "CONFIRMED" || order.status === "IN_QUEUE" || order.status === "SLICING") && (
                            <Button
                                size="sm"
                                onClick={() => handleStartPrint(order.id)}
                                disabled={isLoading || !order.gcodeFileUrl}
                                title={!order.gcodeFileUrl ? "No G-code file - slice the model first" : "Start printing via OctoPrint"}
                                className="h-8 px-3 text-xs bg-[#004D4D] hover:bg-[#003333] text-white disabled:opacity-50"
                            >
                                {!order.gcodeFileUrl ? "Need G-code" : "Start Print"}
                            </Button>
                        )}
                        {order.status === "PRINTING" && (
                            <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(order.id, "POST_PROCESSING")}
                                disabled={isLoading}
                                className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                Finish Print
                            </Button>
                        )}
                        {order.status === "POST_PROCESSING" && (
                            <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(order.id, "PACKING")}
                                disabled={isLoading}
                                className="h-8 px-3 text-xs bg-green-500 hover:bg-green-600 text-white"
                            >
                                Finish QC
                            </Button>
                        )}
                        {order.status === "PACKING" && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setSelectedOrder(order);
                                    setShowShippingModal(true);
                                }}
                                className="h-8 px-3 text-xs bg-sky-500 hover:bg-sky-600 text-white"
                            >
                                Input Tracking
                            </Button>
                        )}
                        {(order.status === "SHIPPED" && order.trackingNumber) && (
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700">{formatCourierLabel(order.courierCode, order.courierService)}</span>
                                <span className="text-[10px] text-slate-500 font-mono tracking-wide">{order.trackingNumber}</span>
                            </div>
                        )}
                    </div>
                );
            },
        },
    ];

    const selectedIds = Object.keys(rowSelection);
    const selectedOrders = filteredOrders.filter((o) => selectedIds.includes(o.id));

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING_PAYMENT: [],
        PAYMENT_FAILED: [],
        CONFIRMED: ["IN_QUEUE"],
        IN_QUEUE: ["SLICING", "PRINTING", "CANCELLED"],
        SLICING: ["PRINTING", "CANCELLED"],
        PRINTING: ["POST_PROCESSING", "CANCELLED"],
        POST_PROCESSING: ["PACKING", "CANCELLED"],
        PACKING: ["SHIPPED"],
        SHIPPED: ["DELIVERED"],
        DELIVERED: ["COMPLETED"],
        COMPLETED: [],
        CANCELLED: [],
        REFUNDED: [],
    };

    const bulkStatusPreview = bulkStatus
        ? selectedOrders.reduce(
            (acc, o) => {
                const allowed = validTransitions[o.status] || [];
                if (allowed.includes(bulkStatus as OrderStatus)) acc.valid += 1;
                else acc.invalid += 1;
                return acc;
            },
            { valid: 0, invalid: 0 }
        )
        : { valid: 0, invalid: 0 };

    const bulkAdvancePreview = selectedOrders.reduce(
        (acc, o) => {
            const allowed = validTransitions[o.status] || [];
            if (allowed.length > 0) acc.valid += 1;
            else acc.invalid += 1;
            return acc;
        },
        { valid: 0, invalid: 0 }
    );

    const handleBulkAssign = async () => {
        if (!bulkPrinterId || selectedIds.length === 0) return;
        setIsLoading(true);
        const result = await bulkAssignOrders(selectedIds, bulkPrinterId);
        if (!result.success) {
            toast.error(result.error || "Failed to assign orders");
        } else {
            toast.success(`Assigned ${result.updated || 0} orders`);
        }
        setIsLoading(false);
    };

    const handleBulkStatusUpdate = async () => {
        if (!bulkStatus || selectedIds.length === 0) return;
        setIsLoading(true);
        const result = await bulkUpdateOrderStatus(selectedIds, bulkStatus as OrderStatus);
        if (!result.success) {
            toast.error(result.error || "Failed to update status");
        } else if (result.failed && result.failed.length > 0) {
            toast.warning(`Updated ${result.updated || 0} orders. Failed: ${result.failed.length}`);
        } else {
            toast.success(`Updated ${result.updated || 0} orders`);
        }
        setIsLoading(false);
    };

    const handleBulkAdvance = async () => {
        if (selectedIds.length === 0) return;
        setIsLoading(true);
        const result = await bulkAdvanceOrderStatus(selectedIds);
        if (!result.success) {
            toast.error(result.error || "Failed to advance orders");
        } else if (result.skipped && result.skipped.length > 0) {
            toast.warning(`Advanced ${result.updated || 0} orders. Skipped: ${result.skipped.length}`);
        } else {
            toast.success(`Advanced ${result.updated || 0} orders`);
        }
        setIsLoading(false);
    };

    const handleExportCsv = () => {
        const rows = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
        const header = ["OrderNumber", "Status", "Customer", "CustomerEmail", "Material", "Quality", "Quantity", "TotalPrice", "Printer", "Courier", "TrackingNumber", "ShippingAddress", "CreatedAt"];
        const lines = rows.map((o) => [
            o.orderNumber || o.id,
            o.status,
            o.user?.name || "",
            o.user?.email || "",
            o.material?.name || "",
            o.quality?.name || "",
            o.quantity,
            o.totalPrice,
            o.printer?.name || "",
            formatCourierLabel(o.courierCode, o.courierService),
            o.trackingNumber || "",
            o.shippingAddress || "",
            new Date(o.createdAt).toISOString(),
        ]);
        const csv = [header, ...lines].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "orders.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    const closeConfirm = () => setConfirmAction(null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Order Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage orders and shipping queue</p>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200 card-shadow">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Printer</label>
                    <select
                        value={filterPrinter}
                        onChange={(e) => setFilterPrinter(e.target.value)}
                        className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All Printers</option>
                        {printers.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Material</label>
                    <select
                        value={filterMaterial}
                        onChange={(e) => setFilterMaterial(e.target.value)}
                        className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All Materials</option>
                        {[...new Set(orders.map(o => o.material?.name).filter(Boolean) as string[])].map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">From</label>
                    <input
                        type="date"
                        value={filterFromDate}
                        onChange={(e) => setFilterFromDate(e.target.value)}
                        className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">To</label>
                    <input
                        type="date"
                        value={filterToDate}
                        onChange={(e) => setFilterToDate(e.target.value)}
                        className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-1 -mb-px overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.key
                                ? "border-primary text-primary"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50 rounded-t-lg"
                                }`}
                        >
                            {tab.label}
                            {orderCounts[tab.key] > 0 && (
                                <span className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                                    }`}>
                                    {orderCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* DataTable */}
            {selectedIds.length > 0 && (
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="text-sm font-semibold text-slate-600">
                        {selectedIds.length} order(s) selected
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={bulkPrinterId}
                            onChange={(e) => setBulkPrinterId(e.target.value)}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                        >
                            <option value="">Assign Printer</option>
                            {printers.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setConfirmAction("assign")}
                            disabled={!bulkPrinterId || isLoading}
                            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
                        >
                            Assign
                        </button>
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                        >
                            <option value="">Update Status</option>
                            {Object.keys(STATUS_LABELS).map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s as OrderStatus]}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setConfirmAction("update")}
                            disabled={!bulkStatus || isLoading || bulkStatusPreview.valid === 0}
                            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
                        >
                            Update
                        </button>
                        <button
                            onClick={() => setConfirmAction("advance")}
                            disabled={isLoading || bulkAdvancePreview.valid === 0}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                        >
                            Advance
                        </button>
                        <button
                            onClick={() => setConfirmAction("export")}
                            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold"
                        >
                            Export CSV
                        </button>
                    </div>
                    <div className="text-[11px] text-slate-500">
                        {bulkStatus ? (
                            <span>
                                Status update: {bulkStatusPreview.valid} valid / {bulkStatusPreview.invalid} invalid
                            </span>
                        ) : (
                            <span>
                                Advance: {bulkAdvancePreview.valid} can advance / {bulkAdvancePreview.invalid} cannot
                            </span>
                        )}
                    </div>
                </div>
            )}

            <DataTable
                columns={columns}
                data={filteredOrders}
                searchKey="stlFileName"
                placeholder="Search order (file name)..."
                enableRowSelection
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                getRowId={(row) => row.id}
            />

            {confirmAction && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 border border-slate-100 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900">Confirm Action</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {confirmAction === "assign" && `Assign ${selectedIds.length} order(s) to selected printer?`}
                            {confirmAction === "update" && `Update ${bulkStatusPreview.valid} order(s) to ${bulkStatus}?`}
                            {confirmAction === "advance" && `Advance ${bulkAdvancePreview.valid} order(s) to next status?`}
                            {confirmAction === "export" && `Export ${selectedOrders.length > 0 ? selectedOrders.length : filteredOrders.length} order(s) to CSV?`}
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeConfirm}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirmAction === "assign") await handleBulkAssign();
                                    if (confirmAction === "update") await handleBulkStatusUpdate();
                                    if (confirmAction === "advance") await handleBulkAdvance();
                                    if (confirmAction === "export") handleExportCsv();
                                    closeConfirm();
                                }}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-bold hover:brightness-110"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shipping Modal */}
            {showShippingModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Input Tracking Info</h3>
                            <button onClick={() => setShowShippingModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Order Item</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{selectedOrder.stlFileName}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Courier Service</label>
                                <div className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-bold text-slate-800">
                                    {selectedOrder ? formatCourierLabel(selectedOrder.courierCode, selectedOrder.courierService) : "Courier tersimpan"}
                                </div>
                                <p className="mt-1.5 text-xs text-slate-500">Courier mengikuti pilihan customer saat checkout. Provider cukup mengisi nomor resi.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tracking Number</label>
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Enter tracking number..."
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowShippingModal(false);
                                        setSelectedOrder(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleShipOrder}
                                    disabled={!trackingNumber.trim() || isLoading}
                                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-all"
                                >
                                    {isLoading ? "Loading..." : "Submit Tracking"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
