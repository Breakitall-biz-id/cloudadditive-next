import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const activeOrderStatuses = ["CONFIRMED", "IN_QUEUE", "SLICING", "PRINTING", "POST_PROCESSING", "PACKING", "SHIPPED"] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [activeOrders, pendingProviders] = await Promise.all([
    prisma.order.count({ where: { status: { in: [...activeOrderStatuses] } } }),
    prisma.provider.count({ where: { isVerified: false } }),
  ]);

  return (
    <AdminShell
      user={{ name: session.user.name, email: session.user.email }}
      signals={{ activeOrders, pendingProviders }}
    >
      {children}
    </AdminShell>
  );
}
