import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getSafeError(error: unknown) {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message.replace(/mysql:\/\/[^@\s]+@/g, "mysql://***@"),
        };
    }

    return {
        name: "UnknownError",
        message: "Unknown database error",
    };
}

export async function GET() {
    try {
        const [users, providers, printers, materials, qualities, settings] = await Promise.all([
            prisma.user.count(),
            prisma.provider.count(),
            prisma.printer.count(),
            prisma.material.count(),
            prisma.printQuality.count(),
            prisma.systemSettings.count(),
        ]);

        return NextResponse.json({
            ok: true,
            database: "reachable",
            counts: {
                users,
                providers,
                printers,
                materials,
                qualities,
                settings,
            },
        });
    } catch (error) {
        console.error("[health/db] Database check failed:", error);

        return NextResponse.json(
            {
                ok: false,
                database: "unreachable",
                error: getSafeError(error),
            },
            { status: 500 }
        );
    }
}
