import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { formatAdminCurrency, formatAdminDateTime, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";
import { adminUpdatePaymentStatus } from "@/actions/admin";

type PageProps = { searchParams: Promise<{ query?: string; status?: string }> };

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query?.trim();
  const status = params.status ?? "ALL";

  const where: Prisma.PaymentWhereInput = {
    ...(status !== "ALL" ? { status: status as Prisma.EnumPaymentStatusFilter["equals"] } : {}),
    ...(query ? { OR: [{ invoiceNumber: { contains: query } }, { order: { orderNumber: { contains: query } } }, { order: { user: { email: { contains: query } } } }] } : {}),
  };

  const [payments, pending, paid, failed, refunded, paidAmount] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: { order: { select: { orderNumber: true, status: true, user: { select: { name: true, email: true } }, provider: { select: { businessName: true } } } } },
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "EXPIRED"] } } }),
    prisma.payment.count({ where: { status: "REFUNDED" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Payments" description="Rekonsiliasi status Midtrans, invoice, payment method, dan sinkronisasi payment dengan order." />
      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Paid Amount" value={formatAdminCurrency(paidAmount._sum.amount)} />
        <StatCard label="Paid" value={paid.toLocaleString("id-ID")} />
        <StatCard label="Pending" value={pending.toLocaleString("id-ID")} />
        <StatCard label="Failed/Expired" value={failed.toLocaleString("id-ID")} />
        <StatCard label="Refunded" value={refunded.toLocaleString("id-ID")} />
      </section>

      <DataCard title="Payment Ledger">
        <form className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input name="query" defaultValue={query} placeholder="Cari invoice, order, email..." className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600" />
          <select name="status" defaultValue={status} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600">
            <option value="ALL">All status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="EXPIRED">Expired</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Filter</button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Admin Update</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4"><p className="font-black text-slate-950">{payment.invoiceNumber}</p><p className="text-xs text-slate-500">{formatAdminDateTime(payment.updatedAt)}</p></td>
                  <td className="px-4 py-4"><p className="font-bold text-slate-800">{payment.order.orderNumber}</p><p className="text-xs text-slate-500">{humanizeEnum(payment.order.status)} • {payment.order.provider?.businessName ?? "No provider"}</p></td>
                  <td className="px-4 py-4"><p className="font-bold text-slate-800">{payment.order.user.name}</p><p className="text-xs text-slate-500">{payment.order.user.email}</p></td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{payment.paymentMethod ?? "-"}</td>
                  <td className="px-4 py-4"><StatusPill className={getStatusTone(payment.status)}>{humanizeEnum(payment.status)}</StatusPill></td>
                  <td className="px-4 py-4">
                    <form key={`${payment.id}-${payment.status}`} action={adminUpdatePaymentStatus} className="grid min-w-48 gap-2">
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <select name="status" defaultValue={payment.status} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-teal-600">
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                      </select>
                      <input name="reason" required minLength={5} placeholder="Audit reason" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-600" />
                      <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Update</button>
                    </form>
                  </td>
                  <td className="px-4 py-4 text-right font-black text-slate-950">{formatAdminCurrency(payment.amount)}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Tidak ada payment sesuai filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}
