"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  CreditCard,
  FileClock,
  Gauge,
  LogOut,
  PackageCheck,
  Printer,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const navGroups: AdminNavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: Gauge },
      { href: "/admin/orders", label: "Orders", icon: PackageCheck },
      { href: "/admin/providers", label: "Providers", icon: ShieldCheck },
      { href: "/admin/printers", label: "Printers", icon: Printer },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/admin/printer-matching", label: "Matching Lab", icon: Route },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/settings", label: "Catalog & Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: FileClock },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Admin";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getCurrentRoute(pathname: string) {
  return navItems.find((item) => isNavActive(pathname, item.href)) ?? navItems[0];
}

interface AdminUser {
  name?: string | null;
  email?: string | null;
}

interface AdminSignals {
  activeOrders: number;
  pendingProviders: number;
}

const sidebarStyle = {
  "--sidebar-width": "17rem",
  "--sidebar": "var(--admin-sidebar)",
  "--sidebar-foreground": "var(--admin-ink)",
  "--sidebar-border": "transparent",
  "--sidebar-accent": "var(--admin-panel)",
  "--sidebar-accent-foreground": "var(--admin-ink)",
  "--sidebar-ring": "rgba(17,17,26,0.12)",
} as CSSProperties;

export function AdminShell({
  children,
  user,
  signals,
}: {
  children: React.ReactNode;
  user?: AdminUser;
  signals?: AdminSignals;
}) {
  const pathname = usePathname() ?? "/admin";
  const currentRoute = getCurrentRoute(pathname);

  return (
    <SidebarProvider style={sidebarStyle} className="admin-workspace-font bg-[var(--admin-sidebar)] text-[var(--admin-ink)]">
      <Sidebar collapsible="icon" className="!border-r-0 border-transparent bg-[var(--admin-sidebar)] shadow-none">
        <SidebarHeader className="h-[84px] justify-center px-5 py-0 group-data-[collapsible=icon]:px-1.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="CloudAdditive Admin"
                className="h-11 rounded-lg px-0 data-[state=open]:bg-[var(--admin-panel)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
              >
                <Link href="/admin" aria-label="CloudAdditive admin overview">
                  <span className="flex aspect-square size-9 items-center justify-center rounded-lg bg-[#090914] text-white">
                    <Boxes className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-[16px] font-semibold tracking-[-0.035em]">CloudAdditive</span>
                    <span className="truncate text-[12px] font-medium text-[#7b8088]">Admin workspace</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-4 py-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label} className="py-3 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:px-0">
              <SidebarGroupLabel className="mb-1 px-1 text-[13px] font-medium normal-case tracking-[-0.01em] text-[#858a93]">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isNavActive(pathname, item.href);
                    const signal = item.href === "/admin/orders"
                      ? signals?.activeOrders
                      : item.href === "/admin/providers"
                        ? signals?.pendingProviders
                        : undefined;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className="h-11 rounded-lg px-3 text-[15px] font-medium text-[#565b64] transition-all hover:bg-[var(--admin-panel)] hover:text-[#11131a] data-[active=true]:bg-[var(--admin-panel)] data-[active=true]:font-medium data-[active=true]:text-[#11131a] data-[active=true]:shadow-[var(--admin-shadow-nav)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:shadow-none [&>svg]:size-[18px] [&>svg]:text-[#6f7580] data-[active=true]:[&>svg]:text-[#11131a]"
                        >
                          <Link href={item.href} aria-current={active ? "page" : undefined}>
                            <Icon strokeWidth={1.7} />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {Boolean(signal) && (
                          <SidebarMenuBadge className="min-w-5 rounded-full bg-[#11111a] px-1.5 text-center text-[10px] font-semibold tabular-nums text-white group-data-[collapsible=icon]:hidden">
                            {signal}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-4 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] p-2 shadow-[var(--admin-shadow-control)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none">
                <Avatar className="size-9 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-[#e9f6f2] text-[11px] font-semibold text-[#087164]">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-xs font-semibold text-[#17201d]">{user?.name || "Admin"}</p>
                  <p className="truncate text-[10px] text-[#84908b]">{user?.email}</p>
                </div>
                <form action={logoutAction} className="group-data-[collapsible=icon]:hidden">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    title="Keluar"
                    aria-label="Keluar dari akun"
                    className="rounded-lg text-[#89909a] hover:bg-[#fff0ee] hover:text-[#a43f35]"
                  >
                    <LogOut strokeWidth={1.7} />
                  </Button>
                </form>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="mt-2 mr-2 mb-2 min-w-0 overflow-hidden rounded-tl-[1.1rem] rounded-tr-none rounded-br-none rounded-bl-none bg-[var(--admin-panel)] shadow-[var(--admin-shadow-shell)]">
        <header className="sticky top-0 z-20 flex h-[84px] shrink-0 items-center gap-3 border-b border-[var(--admin-line-soft)] bg-[var(--admin-panel)]/95 px-5 backdrop-blur-xl md:px-6 xl:px-7">
          <SidebarTrigger className="size-10 rounded-lg border border-[var(--admin-line)] bg-white text-[#535862] shadow-[var(--admin-shadow-control)] hover:bg-[#f6f7f8]" />

          <Breadcrumb className="hidden min-w-0 lg:block">
            <BreadcrumbList className="flex-nowrap gap-2 text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="font-medium text-[#747881]">
                  <Link href="/admin">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-[#b2bab6]" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-semibold text-[#101117]">{currentRoute.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <form action="/admin/orders" method="get" className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6f737b]" strokeWidth={1.8} />
              <Input
                id="admin-global-search"
                name="query"
                type="search"
                aria-label="Cari order"
                placeholder="Cari nomor order..."
                className="h-11 w-56 rounded-lg border-[var(--admin-line)] bg-[#f8f9fb] pl-11 text-sm shadow-[var(--admin-shadow-control)] transition-[width,border-color,box-shadow] placeholder:text-[#8d929b] focus-visible:w-72 focus-visible:border-[#d8dbe1] focus-visible:ring-[#11111a]/5 xl:w-72"
              />
            </form>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden h-11 rounded-lg border-[var(--admin-line)] bg-white px-4 text-sm font-medium text-[#202229] shadow-[var(--admin-shadow-control)] hover:border-[#d8dbe1] hover:bg-[#f8f9fb] sm:inline-flex"
            >
              <Link href="/admin/printer-matching">
                <Route className="text-[#08746b]" strokeWidth={1.8} />
                Matching Lab
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="icon"
              className="relative size-11 rounded-lg border-[var(--admin-line)] bg-white text-[#202229] shadow-[var(--admin-shadow-control)] hover:border-[#d8dbe1] hover:bg-[#f8f9fb]"
            >
              <Link
                href="/admin/providers"
                aria-label={signals?.pendingProviders ? `${signals.pendingProviders} provider menunggu review` : "Buka provider"}
              >
                <Bell strokeWidth={1.7} />
                {Boolean(signals?.pendingProviders) && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[#f04438] ring-2 ring-white" />}
              </Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1560px] flex-1 bg-[var(--admin-panel)] px-5 py-6 md:px-6 md:py-7 xl:px-6 xl:py-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AdminPageHeader({
  eyebrow,
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
    <header className="mb-7 flex max-w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-5xl">
        {eyebrow && <p className="text-[13px] font-medium tracking-[-0.01em] text-[#767b84]">{eyebrow}</p>}
        <h1 className={cn("text-[clamp(1.9rem,3vw,2.65rem)] font-semibold leading-[1.03] tracking-[-0.055em] text-[#090914]", eyebrow && "mt-2")}>{title}</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#565b65]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function StatCard({ label, value, caption }: { label: string; value: string | number; caption?: string }) {
  return (
    <Card className="group gap-0 rounded-[0.9rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)] transition-[background-color,transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#fbfbfc] hover:shadow-[var(--admin-shadow-card-hover)]">
      <CardContent className="p-4">
        <p className="text-[13px] font-medium tracking-[-0.015em] text-[#858a93]">{label}</p>
        <p className="mt-3 text-[1.9rem] font-semibold leading-none tracking-[-0.045em] tabular-nums text-[#090914]">{value}</p>
        {caption && <p className="mt-3 text-[13px] leading-5 text-[#8b9099]">{caption}</p>}
      </CardContent>
    </Card>
  );
}

export function DataCard({
  title,
  children,
  action,
  className,
  contentClassName,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden rounded-[0.9rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]", className)}>
      <CardHeader className="min-h-16 grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--admin-line-soft)] px-5 py-3.5">
        <CardTitle className="text-[19px] font-semibold tracking-[-0.035em] text-[#090914]">{title}</CardTitle>
        {action && <CardAction className="static col-start-2 row-start-1">{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("p-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function AdminWorkspace({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function AdminHeroCard({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="px-1 pb-4 pt-1 md:px-0 md:pb-5 md:pt-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow && <p className="text-[13px] font-medium tracking-[-0.01em] text-[#767b84]">{eyebrow}</p>}
          <h1 className={cn("text-balance text-[clamp(2rem,3vw,2.7rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-[#090914]", eyebrow && "mt-3")}>{title}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#565b65]">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </section>
  );
}

export function AdminSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-[21px] font-semibold leading-tight tracking-[-0.04em] text-[#090914]">{title}</h2>
        {description && <p className="mt-1 text-sm leading-5 text-[#737883]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusPill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold leading-4", className)}>
      {children}
    </Badge>
  );
}
