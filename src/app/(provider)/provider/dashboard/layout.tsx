import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { StitchSidebar } from "@/components/dashboard/StitchSidebar"

export default async function ProviderDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
        redirect("/dashboard")
    }

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        select: { isVerified: true }
    })

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-inter">
            {/* Stitch Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64">
                <StitchSidebar
                    user={session.user}
                    isVerified={provider?.isVerified ?? false}
                    hasProviderProfile={true}
                />
            </div>

            {/* Main Content */}
            <main className="pl-64 min-h-screen">
                <div className="p-8 max-w-[1400px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    )
}
