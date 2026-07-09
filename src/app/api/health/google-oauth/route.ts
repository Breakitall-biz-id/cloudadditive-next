import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CHECKS = [
    "https://accounts.google.com/.well-known/openid-configuration",
    "https://oauth2.googleapis.com/token",
    "https://www.googleapis.com/oauth2/v3/userinfo",
];

function serializeError(error: unknown) {
    if (!(error instanceof Error)) {
        return { name: "UnknownError", message: "Unknown error" };
    }

    const cause = error.cause as { code?: string; errors?: Array<Record<string, unknown>> } | undefined;

    return {
        name: error.name,
        message: error.message,
        code: cause?.code,
        errors: cause?.errors?.map((item) => ({
            code: item.code,
            syscall: item.syscall,
            address: item.address,
            port: item.port,
            message: item.message,
        })),
    };
}

export async function GET() {
    const results = await Promise.all(
        CHECKS.map(async (url) => {
            try {
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(8000),
                    cache: "no-store",
                });

                return {
                    url,
                    ok: true,
                    status: response.status,
                    contentType: response.headers.get("content-type"),
                };
            } catch (error) {
                return {
                    url,
                    ok: false,
                    error: serializeError(error),
                };
            }
        })
    );

    return NextResponse.json({
        ok: results.every((item) => item.ok),
        googleClientConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        checks: results,
    });
}
