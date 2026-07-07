import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { StitchSidebar } from "@/components/dashboard/StitchSidebar"

export default async function CustomerDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Check if user has a provider profile
    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
    })

    const hasProviderProfile = !!provider

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64">
                <StitchSidebar
                    user={session.user}
                    hasProviderProfile={hasProviderProfile}
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
