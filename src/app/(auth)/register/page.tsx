"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer, Loader2, AlertCircle, CheckCircle } from "lucide-react"

const registerSchema = z.object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak sama",
    path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterForm>()

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                setError(result.error || "Terjadi kesalahan")
            } else {
                setSuccess(true)
                setTimeout(() => {
                    router.push("/login")
                }, 2000)
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <Card className="relative w-full max-w-md bg-slate-900/80 border-slate-800 backdrop-blur-xl">
                <CardHeader className="text-center pb-2">
                    <Link href="/" className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Printer className="h-6 w-6 text-white" />
                        </div>
                    </Link>
                    <CardTitle className="text-2xl font-bold text-white">Buat Akun Baru</CardTitle>
                    <CardDescription className="text-slate-400">
                        Daftar untuk mulai menggunakan layanan kami
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="py-8 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                                <CheckCircle className="h-8 w-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Registrasi Berhasil!</h3>
                            <p className="text-slate-400 text-sm">Mengalihkan ke halaman login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-300">Nama Lengkap</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                                    {...register("name")}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-400">{errors.name.message}</p>
                                )}
                            </div>

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
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
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

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-300">Konfirmasi Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                                    {...register("confirmPassword")}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
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
                                    "Daftar"
                                )}
                            </Button>
                        </form>
                    )}

                    {!success && (
                        <div className="mt-6 text-center text-sm text-slate-400">
                            Sudah punya akun?{" "}
                            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                                Masuk
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
