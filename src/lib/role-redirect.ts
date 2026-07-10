import type { Role } from "@prisma/client";

export function getDashboardPathForRole(role?: Role | string | null) {
    if (role === "PROVIDER" || role === "ADMIN") {
        return "/provider/dashboard";
    }

    return "/dashboard";
}
