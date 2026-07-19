import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { AdminActionPanel, AdminButton, AdminFilterForm, AdminInput, AdminSearchInput, AdminSelect, AdminTableFrame } from "@/components/admin/AdminControls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAdminCurrency, formatAdminDateTime, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";
import { adminUpdatePaymentStatus } from "@/actions/admin";

type PageProps = { searchParams: Promise<{ query?: string; status?: string }> };
const paymentStatusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "EXPIRED", label: "Expired" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

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
        <AdminFilterForm>
          <AdminSearchInput name="query" defaultValue={query} placeholder="Cari invoice, order, email..." />
          <AdminSelect name="status" defaultValue={status} options={[{ value: "ALL", label: "All status" }, ...paymentStatusOptions]} />
          <AdminButton>Filter</AdminButton>
        </AdminFilterForm>

        <AdminTableFrame>
          <Table className="min-w-[900px]">
            <TableHeader className="bg-[#f2f4f1] text-xs font-semibold uppercase tracking-[0.08em] text-[#6f7b75]">
              <TableRow><TableHead className="px-4 py-3">Invoice</TableHead><TableHead className="px-4 py-3">Order</TableHead><TableHead className="px-4 py-3">Customer</TableHead><TableHead className="px-4 py-3">Method</TableHead><TableHead className="px-4 py-3">Status</TableHead><TableHead className="px-4 py-3">Admin Update</TableHead><TableHead className="px-4 py-3 text-right">Amount</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-[#f8f9fb]">
                  <TableCell className="px-4 py-4"><p className="font-semibold text-slate-950">{payment.invoiceNumber}</p><p className="text-xs text-slate-500">{formatAdminDateTime(payment.updatedAt)}</p></TableCell>
                  <TableCell className="px-4 py-4"><p className="font-semibold text-slate-800">{payment.order.orderNumber}</p><p className="text-xs text-slate-500">{humanizeEnum(payment.order.status)} • {payment.order.provider?.businessName ?? "No provider"}</p></TableCell>
                  <TableCell className="px-4 py-4"><p className="font-semibold text-slate-800">{payment.order.user.name}</p><p className="text-xs text-slate-500">{payment.order.user.email}</p></TableCell>
                  <TableCell className="px-4 py-4 font-semibold text-slate-700">{payment.paymentMethod ?? "-"}</TableCell>
                  <TableCell className="px-4 py-4"><StatusPill className={getStatusTone(payment.status)}>{humanizeEnum(payment.status)}</StatusPill></TableCell>
                  <TableCell className="px-4 py-4">
                    <form key={`${payment.id}-${payment.status}`} action={adminUpdatePaymentStatus}>
                      <AdminActionPanel className="min-w-48">
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <AdminSelect name="status" defaultValue={payment.status} options={paymentStatusOptions} triggerClassName="h-8 text-xs" />
                      <AdminInput name="reason" required minLength={5} placeholder="Audit reason" className="h-8 text-xs" />
                      <AdminButton className="h-8 bg-[#17201d] text-xs text-white hover:bg-[#075e57]">Update</AdminButton>
                      </AdminActionPanel>
                    </form>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-right font-semibold text-slate-950">{formatAdminCurrency(payment.amount)}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && <TableRow><TableCell colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Tidak ada payment sesuai filter.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </DataCard>
    </div>
  );
}
