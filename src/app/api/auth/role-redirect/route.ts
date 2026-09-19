import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardPathForRole } from "@/lib/role-redirect";

function getPublicAppUrl(request: Request) {
    const configuredUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;

    if (configuredUrl) {
        return configuredUrl;
    }

    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");

    if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    }

    return requestUrl.origin;
}

export async function GET(request: Request) {
    const session = await auth();
    const url = new URL(getDashboardPathForRole(session?.user?.role), getPublicAppUrl(request));

    return NextResponse.redirect(url);
}
