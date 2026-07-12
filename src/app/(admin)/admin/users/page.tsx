import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { formatAdminCurrency, formatAdminDate, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";
import { adminUpdateUserRole } from "@/actions/admin";

type PageProps = { searchParams: Promise<{ query?: string; role?: string }> };

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query?.trim();
  const role = params.role ?? "ALL";

  const where: Prisma.UserWhereInput = {
    ...(role !== "ALL" ? { role: role as Prisma.EnumRoleFilter["equals"] } : {}),
    ...(query ? { OR: [{ name: { contains: query } }, { email: { contains: query } }, { phone: { contains: query } }] } : {}),
  };

  const [users, totalUsers, admins, providers, customers] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        provider: { select: { businessName: true, isVerified: true } },
        orders: { select: { id: true, totalPrice: true, status: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "PROVIDER" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Users" description="Kelola konteks akun customer, provider, dan admin. Perubahan role wajib memakai audit reason dan tercatat di audit log." />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={totalUsers.toLocaleString("id-ID")} />
        <StatCard label="Customers" value={customers.toLocaleString("id-ID")} />
        <StatCard label="Providers" value={providers.toLocaleString("id-ID")} />
        <StatCard label="Admins" value={admins.toLocaleString("id-ID")} />
      </section>

      <DataCard title="User Directory">
        <form className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input name="query" defaultValue={query} placeholder="Cari nama, email, phone..." className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600" />
          <select name="role" defaultValue={role} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600">
            <option value="ALL">All roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="PROVIDER">Provider</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Filter</button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Role Update</th><th className="px-4 py-3 text-right">Spend</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((user) => {
                const spend = user.orders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
                return (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4"><p className="font-black text-slate-950">{user.name}</p><p className="text-xs text-slate-500">{user.email} • joined {formatAdminDate(user.createdAt)}</p></td>
                    <td className="px-4 py-4"><StatusPill className={getStatusTone(user.role)}>{humanizeEnum(user.role)}</StatusPill></td>
                    <td className="px-4 py-4"><p className="font-semibold text-slate-700">{user.provider?.businessName ?? "-"}</p><p className="text-xs text-slate-500">{user.provider ? (user.provider.isVerified ? "Verified" : "Pending") : "No provider profile"}</p></td>
                    <td className="px-4 py-4 font-black text-slate-900">{user.orders.length}</td>
                    <td className="px-4 py-4">
                      <form key={`${user.id}-${user.role}`} action={adminUpdateUserRole} className="grid min-w-48 gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select name="role" defaultValue={user.role} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-teal-600">
                          <option value="CUSTOMER">Customer</option>
                          <option value="PROVIDER">Provider</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <input name="reason" required minLength={5} placeholder="Audit reason" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-600" />
                        <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Update Role</button>
                      </form>
                    </td>
                    <td className="px-4 py-4 text-right font-black text-slate-950">{formatAdminCurrency(spend)}</td>
                  </tr>
                );
              })}
              {users.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Tidak ada user sesuai filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}
