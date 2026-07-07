"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const resetPasswordSchema = z.object({
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak sama",
    path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

    const token = searchParams.get("token")
    const email = searchParams.get("email")

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordForm>()

    // Validate token on mount
    useEffect(() => {
        if (!token || !email) {
            setIsValidToken(false)
            return
        }
        // For now, assume token is valid if present
        // Real validation happens on submit
        setIsValidToken(true)
    }, [token, email])

    const onSubmit = async (data: ResetPasswordForm) => {
        if (!token || !email) {
            setError("Link reset tidak valid")
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    email,
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
                }, 3000)
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.")
        } finally {
            setIsLoading(false)
        }
    }

    // Invalid token state
    if (isValidToken === false) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="text-center max-w-md px-6">
                    <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-red-600">error</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Link Tidak Valid</h2>
                    <p className="text-slate-500 mb-8">
                        Link reset password tidak valid atau sudah kadaluarsa.
                        Silakan request link baru.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="inline-flex items-center gap-2 bg-primary hover:bg-cyber-violet text-white font-bold py-3 px-6 rounded-xl transition-colors"
                    >
                        Request Link Baru
                    </Link>
                </div>
            </div>
        )
    }

    // Loading state
    if (isValidToken === null) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="text-center max-w-md px-6">
                    <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Password Berhasil Direset!</h2>
                    <p className="text-slate-500 mb-8">
                        Password Anda telah berhasil diubah.
                        Anda akan dialihkan ke halaman login...
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-primary font-semibold hover:text-cyber-violet transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        Login Sekarang
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-white">
            {/* Left Side - Hero Image */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
                <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHOcYGLzWQ38gYTOV8_lLdVaAyFhHDbnWH5gPybHFYTTBfVjAIln0-lkLxF2vMwKMx1kO872ljwvkdbRemdt8jqKfMDhQztf31wXKQOsuMJ1U89cBbj7BvXLgk1XCFTT6vE0iokfE_H9vNYI-KEW5aA6s803cj6TyVb5Rjop3ofylMm0fjjg7of1jlqKC8aZasaADzv6J9VyrCnTm_AzXSV9MkW-OlbZMUsNUJwFnjxXEgXH6Qv29ciw79LZTxOu5XZW1C6N1d-g?q=80&w=2070"
                    alt="3D Printing Manufacturing"
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="relative z-10 w-full h-full flex flex-col justify-end p-12 xl:p-20 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent">
                    <div className="hero-grid absolute inset-0 pointer-events-none opacity-20" />
                    <div className="max-w-md">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                            </span>
                            ALMOST THERE
                        </div>
                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
                            Create New Password
                        </h1>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Choose a strong password to keep your account secure.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col items-center justify-center p-6 md:p-12 xl:p-24 bg-white">
                <div className="w-full max-w-[440px]">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 mb-12">
                        <div className="bg-primary p-2 rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">CloudAdditive</span>
                    </Link>

                    {/* Header */}
                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Reset Password</h2>
                        <p className="text-slate-500">Masukkan password baru untuk akun Anda.</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2" htmlFor="password">
                                Password Baru
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none placeholder:text-slate-400"
                                {...register("password")}
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2" htmlFor="confirmPassword">
                                Konfirmasi Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none placeholder:text-slate-400"
                                {...register("confirmPassword")}
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-cyber-violet text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    Reset Password
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-20 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <div className="flex gap-4">
                            <span>LATENCY: 12ms</span>
                            <span>NODE: ID-JKT-1</span>
                        </div>
                        <span>© 2024 CLOUDADDITIVE</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
