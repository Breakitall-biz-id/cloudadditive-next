import type { Role } from "@prisma/client";

export function getDashboardPathForRole(role?: Role | string | null) {
    if (role === "ADMIN") {
        return "/admin";
    }

    if (role === "PROVIDER") {
        return "/provider/dashboard";
    }

    return "/dashboard";
}
