import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
    const [
        totalUsers,
        totalProviders,
        verifiedProviders,
        totalPrinters,
        totalOrders,
        pendingOrders,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.provider.count(),
        prisma.provider.count({ where: { isVerified: true } }),
        prisma.printer.count(),
        prisma.order.count(),
        prisma.order.count({
            where: {
                status: {
                    in: ["PENDING_PAYMENT", "CONFIRMED", "IN_QUEUE", "SLICING", "PRINTING", "POST_PROCESSING", "PACKING", "SHIPPED"],
                },
            },
        }),
    ]);

    const stats = [
        { label: "Users", value: totalUsers },
        { label: "Providers", value: totalProviders },
        { label: "Verified Providers", value: verifiedProviders },
        { label: "Printers", value: totalPrinters },
        { label: "Orders", value: totalOrders },
        { label: "Active Orders", value: pendingOrders },
    ];

    return (
        <div className="space-y-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin</p>
                    <h1 className="mt-2 text-3xl font-black text-slate-950">CloudAdditive Admin</h1>
                    <p className="mt-2 text-sm text-slate-500">Operational overview for users, providers, printers, and orders.</p>
                </div>
                <Link
                    href="/dashboard"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                    View Customer Portal
                </Link>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                        <p className="mt-3 text-3xl font-black text-slate-950">{item.value.toLocaleString("id-ID")}</p>
                    </div>
                ))}
            </section>
        </div>
    );
}
