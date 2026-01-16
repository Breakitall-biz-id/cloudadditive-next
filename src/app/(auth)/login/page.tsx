"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer, Loader2, AlertCircle } from "lucide-react"

const loginSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(1, "Password harus diisi"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>()

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            })

            if (result?.error) {
                setError("Email atau password salah")
            } else {
                router.push("/dashboard")
                router.refresh()
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <Card className="relative w-full max-w-md bg-slate-900/80 border-slate-800 backdrop-blur-xl">
                <CardHeader className="text-center pb-2">
                    <Link href="/" className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Printer className="h-6 w-6 text-white" />
                        </div>
                    </Link>
                    <CardTitle className="text-2xl font-bold text-white">Masuk ke Akun</CardTitle>
                    <CardDescription className="text-slate-400">
                        Masukkan email dan password Anda
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nama@email.com"
                                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-400">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                                <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">
                                    Lupa password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                                {...register("password")}
                            />
                            {errors.password && (
                                <p className="text-sm text-red-400">{errors.password.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Belum punya akun?{" "}
                        <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
                            Daftar sekarang
                        </Link>
                    </div>

                    {/* Demo accounts info */}
                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-500 mb-2">Demo Accounts:</p>
                        <div className="space-y-1 text-xs text-slate-400">
                            <p><span className="text-slate-300">Admin:</span> admin@cloudadditive.com / admin123</p>
                            <p><span className="text-slate-300">Provider:</span> workshop@uii.ac.id / provider123</p>
                            <p><span className="text-slate-300">Customer:</span> customer@example.com / customer123</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
