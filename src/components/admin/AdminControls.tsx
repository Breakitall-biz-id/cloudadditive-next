"use client";

import type * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AdminSelectOption = {
  value: string;
  label: string;
};

export function AdminFilterForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form className={cn("mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]", className)}>
      {children}
    </form>
  );
}

export function AdminSearchInput(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a39e]" strokeWidth={1.7} />
      <Input
        type="search"
        {...props}
        className={cn("h-10 rounded-lg border-[var(--admin-line)] bg-[#f8f9fb] pl-9 text-sm font-medium shadow-[var(--admin-shadow-control)] placeholder:text-[#9aa39f] focus-visible:border-[#d8dbe1] focus-visible:ring-[#11111a]/5", props.className)}
      />
    </div>
  );
}

export function AdminInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn("h-10 rounded-lg border-[var(--admin-line)] bg-[#f8f9fb] text-sm font-medium shadow-[var(--admin-shadow-control)] placeholder:text-[#9aa39f] focus-visible:border-[#d8dbe1] focus-visible:ring-[#11111a]/5", props.className)}
    />
  );
}

export function AdminSelect({
  options,
  placeholder,
  className,
  triggerClassName,
  ...props
}: React.ComponentProps<typeof Select> & {
  options: AdminSelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}) {
  return (
    <Select {...props}>
      <SelectTrigger className={cn("h-10 w-full rounded-lg border-[var(--admin-line)] bg-[#f8f9fb] text-sm font-medium shadow-[var(--admin-shadow-control)] focus:ring-[#11111a]/5", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-lg border-[var(--admin-line)] shadow-[var(--admin-shadow-card)]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AdminButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn("h-10 rounded-lg px-4 text-sm font-medium shadow-[var(--admin-shadow-control)]", props.className)}
    />
  );
}

export function AdminField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Label className={cn("grid gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#858a93]", className)}>
      <span>{label}</span>
      {children}
    </Label>
  );
}

export function AdminActionPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-2 rounded-[0.85rem] border-[var(--admin-line)] bg-[#f8f9fb] p-4 shadow-[var(--admin-shadow-card)]", className)}>
      {children}
    </Card>
  );
}

export function AdminTableFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[0.85rem] border border-[var(--admin-line)] bg-white shadow-[var(--admin-shadow-card)]", className)}>
      {children}
    </div>
  );
}
