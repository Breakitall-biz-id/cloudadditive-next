import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CreditCard,
  FileClock,
  Gauge,
  PackageCheck,
  Printer,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/orders", label: "Orders", icon: PackageCheck },
  { href: "/admin/providers", label: "Providers", icon: ShieldCheck },
  { href: "/admin/printers", label: "Printers", icon: Printer },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/settings", label: "Catalog & Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileClock },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-950">
      <div className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white/95 px-5 py-6 lg:block">
        <Link href="/admin" className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-900 text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black leading-tight">CloudAdditive</p>
            <p className="text-xs font-semibold text-slate-500">Admin Control Center</p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-slate-950 p-4 text-white">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-200">
            <BarChart3 className="h-4 w-4" />
            Operational Mode
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            Semua angka di dashboard ini dibaca langsung dari database, bukan dummy data.
          </p>
        </div>
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur md:px-8 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-base font-black">CloudAdditive Admin</Link>
            <Link href="/dashboard" className="text-xs font-bold text-teal-800">Customer portal</Link>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                {item.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  eyebrow = "Admin",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-800">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function StatCard({ label, value, caption }: { label: string; value: string | number; caption?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      {caption && <p className="mt-2 text-xs font-semibold text-slate-500">{caption}</p>}
    </div>
  );
}

export function DataCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusPill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", className)}>
      {children}
    </span>
  );
}
