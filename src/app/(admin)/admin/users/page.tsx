import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { AdminActionPanel, AdminButton, AdminFilterForm, AdminInput, AdminSearchInput, AdminSelect, AdminTableFrame } from "@/components/admin/AdminControls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAdminCurrency, formatAdminDate, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";
import { adminUpdateUserRole } from "@/actions/admin";

type PageProps = { searchParams: Promise<{ query?: string; role?: string }> };
const roleOptions = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "PROVIDER", label: "Provider" },
  { value: "ADMIN", label: "Admin" },
];

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
        <AdminFilterForm>
          <AdminSearchInput name="query" defaultValue={query} placeholder="Cari nama, email, phone..." />
          <AdminSelect name="role" defaultValue={role} options={[{ value: "ALL", label: "All roles" }, ...roleOptions]} />
          <AdminButton>Filter</AdminButton>
        </AdminFilterForm>

        <AdminTableFrame>
          <Table className="min-w-[840px]">
            <TableHeader className="bg-[#f2f4f1] text-xs font-semibold uppercase tracking-[0.08em] text-[#6f7b75]">
              <TableRow><TableHead className="px-4 py-3">User</TableHead><TableHead className="px-4 py-3">Role</TableHead><TableHead className="px-4 py-3">Provider</TableHead><TableHead className="px-4 py-3">Orders</TableHead><TableHead className="px-4 py-3">Role Update</TableHead><TableHead className="px-4 py-3 text-right">Spend</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const spend = user.orders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
                return (
                  <TableRow key={user.id} className="hover:bg-[#f8f9fb]">
                    <TableCell className="px-4 py-4"><p className="font-semibold text-slate-950">{user.name}</p><p className="text-xs text-slate-500">{user.email} • joined {formatAdminDate(user.createdAt)}</p></TableCell>
                    <TableCell className="px-4 py-4"><StatusPill className={getStatusTone(user.role)}>{humanizeEnum(user.role)}</StatusPill></TableCell>
                    <TableCell className="px-4 py-4"><p className="font-semibold text-slate-700">{user.provider?.businessName ?? "-"}</p><p className="text-xs text-slate-500">{user.provider ? (user.provider.isVerified ? "Verified" : "Pending") : "No provider profile"}</p></TableCell>
                    <TableCell className="px-4 py-4 font-semibold text-slate-900">{user.orders.length}</TableCell>
                    <TableCell className="px-4 py-4">
                      <form key={`${user.id}-${user.role}`} action={adminUpdateUserRole}>
                        <AdminActionPanel className="min-w-48">
                        <input type="hidden" name="userId" value={user.id} />
                        <AdminSelect name="role" defaultValue={user.role} options={roleOptions} triggerClassName="h-8 text-xs" />
                        <AdminInput name="reason" required minLength={5} placeholder="Audit reason" className="h-8 text-xs" />
                        <AdminButton className="h-8 bg-[#17201d] text-xs text-white hover:bg-[#075e57]">Update Role</AdminButton>
                        </AdminActionPanel>
                      </form>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right font-semibold text-slate-950">{formatAdminCurrency(spend)}</TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && <TableRow><TableCell colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Tidak ada user sesuai filter.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </DataCard>
    </div>
  );
}
