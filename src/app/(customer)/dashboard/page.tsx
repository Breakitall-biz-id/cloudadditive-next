import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Package,
    Clock,
    CheckCircle,
    Plus,
    Printer,
    ArrowRight
} from "lucide-react"

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Redirect based on role
    if (session.user.role === "ADMIN") {
        redirect("/admin/dashboard")
    } else if (session.user.role === "PROVIDER") {
        redirect("/provider/dashboard")
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Printer className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">CloudAdditive</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">
                                Halo, <span className="text-white">{session.user.name}</span>
                            </span>
                            <form action={async () => {
                                "use server"
                                const { signOut } = await import("@/lib/auth")
                                await signOut({ redirectTo: "/" })
                            }}>
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                    Keluar
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Card */}
                <Card className="mb-8 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                Selamat datang, {session.user.name}! 👋
                            </h1>
                            <p className="text-slate-400">
                                Siap untuk mencetak ide Anda? Mulai order 3D print sekarang.
                            </p>
                        </div>
                        <Link href="/order">
                            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0">
                                <Plus className="mr-2 h-4 w-4" />
                                Order Baru
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Dalam Proses</p>
                                    <p className="text-2xl font-bold text-white">0</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Dikirim</p>
                                    <p className="text-2xl font-bold text-white">0</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Selesai</p>
                                    <p className="text-2xl font-bold text-white">0</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Orders */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-white">Order Terbaru</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Daftar order 3D print Anda
                                </CardDescription>
                            </div>
                            <Link href="/orders">
                                <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
                                    Lihat Semua
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <Package className="h-8 w-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Belum ada order</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Mulai order pertama Anda sekarang
                            </p>
                            <Link href="/order">
                                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Buat Order
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
