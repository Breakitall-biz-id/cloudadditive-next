import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardPathForRole } from "@/lib/role-redirect";

export async function GET(request: Request) {
    const session = await auth();
    const url = new URL(getDashboardPathForRole(session?.user?.role), request.url);

    return NextResponse.redirect(url);
}
