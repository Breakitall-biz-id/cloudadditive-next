import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { formatAdminCurrency, formatAdminDate, maskBankAccount } from "@/lib/admin-metrics";
import { setProviderVerification } from "@/actions/admin";

type PageProps = {
  searchParams: Promise<{ query?: string; verification?: string }>;
};

export default async function AdminProvidersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query?.trim();
  const verification = params.verification ?? "ALL";

  const where = {
    ...(verification === "VERIFIED" ? { isVerified: true } : verification === "PENDING" ? { isVerified: false } : {}),
    ...(query
      ? {
          OR: [
            { businessName: { contains: query } },
            { city: { contains: query } },
            { province: { contains: query } },
            { user: { email: { contains: query } } },
            { user: { name: { contains: query } } },
          ],
        }
      : {}),
  };

  const [providers, totalProviders, verifiedProviders, pendingProviders, totalProviderRevenue] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy: [{ isVerified: "asc" }, { createdAt: "desc" }],
      take: 60,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        printers: { select: { id: true, status: true, isAcceptingOrders: true } },
        orders: { select: { id: true, status: true, printingCost: true } },
      },
    }),
    prisma.provider.count(),
    prisma.provider.count({ where: { isVerified: true } }),
    prisma.provider.count({ where: { isVerified: false } }),
    prisma.order.aggregate({ where: { providerId: { not: null }, payment: { status: "PAID" } }, _sum: { printingCost: true } }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Providers" description="Review provider, kesiapan printer, data bisnis, payout account, dan performa order dari satu tempat." />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Providers" value={totalProviders.toLocaleString("id-ID")} />
        <StatCard label="Verified" value={verifiedProviders.toLocaleString("id-ID")} />
        <StatCard label="Pending Review" value={pendingProviders.toLocaleString("id-ID")} />
        <StatCard label="Provider Revenue" value={formatAdminCurrency(totalProviderRevenue._sum.printingCost)} />
      </section>

      <DataCard title="Provider Directory">
        <form className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input name="query" defaultValue={query} placeholder="Cari provider, kota, email..." className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600" />
          <select name="verification" defaultValue={verification} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600">
            <option value="ALL">All verification</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
          </select>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Filter</button>
        </form>

        <div className="grid gap-4 xl:grid-cols-2">
          {providers.map((provider) => {
            const onlinePrinters = provider.printers.filter((printer) => ["ONLINE", "PRINTING", "PAUSED"].includes(printer.status)).length;
            const activeOrders = provider.orders.filter((order) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status)).length;
            const revenue = provider.orders.reduce((total, order) => total + Number(order.printingCost), 0);

            return (
              <article key={provider.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-950">{provider.businessName}</p>
                    <p className="mt-1 text-sm text-slate-500">{provider.user.name} • {provider.user.email}</p>
                  </div>
                  <StatusPill className={provider.isVerified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                    {provider.isVerified ? "Verified" : "Pending"}
                  </StatusPill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Printers</p>
                    <p className="mt-1 text-xl font-black">{onlinePrinters}/{provider.printers.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Active Orders</p>
                    <p className="mt-1 text-xl font-black">{activeOrders}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Revenue</p>
                    <p className="mt-1 text-xl font-black">{formatAdminCurrency(revenue)}</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="font-black text-slate-400">Location</dt><dd className="font-semibold text-slate-700">{provider.city}, {provider.province}</dd></div>
                  <div><dt className="font-black text-slate-400">Business</dt><dd className="font-semibold text-slate-700">{provider.businessType ?? "-"} • {provider.businessNumber ?? "No NIB"}</dd></div>
                  <div><dt className="font-black text-slate-400">Bank</dt><dd className="font-semibold text-slate-700">{provider.bankName ?? "Belum diisi"} • {maskBankAccount(provider.bankAccountNumber)}</dd></div>
                  <div><dt className="font-black text-slate-400">Joined</dt><dd className="font-semibold text-slate-700">{formatAdminDate(provider.createdAt)}</dd></div>
                </dl>

                <form action={setProviderVerification} className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="providerId" value={provider.id} />
                  <input type="hidden" name="isVerified" value={provider.isVerified ? "false" : "true"} />
                  <input name="reason" required minLength={5} placeholder={provider.isVerified ? "Alasan unverify provider" : "Alasan approve provider"} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600" />
                  <button className={provider.isVerified ? "rounded-2xl bg-rose-700 px-5 py-3 text-sm font-black text-white" : "rounded-2xl bg-teal-800 px-5 py-3 text-sm font-black text-white"}>
                    {provider.isVerified ? "Unverify" : "Verify"}
                  </button>
                </form>
              </article>
            );
          })}
          {providers.length === 0 && <p className="text-sm font-semibold text-slate-500">Tidak ada provider sesuai filter.</p>}
        </div>
      </DataCard>
    </div>
  );
}
