"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const loginSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(1, "Password harus diisi"),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Get redirect URL from query params (for hybrid flow)
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

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
                router.push(callbackUrl)
                router.refresh()
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = () => {
        signIn("google", { callbackUrl })
    }

    return (
        <div className="flex h-screen bg-white">
            {/* Left Side - Hero Image */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
                <Image
                    src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070"
                    alt="3D Printing Manufacturing"
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="relative z-10 w-full h-full flex flex-col justify-end p-12 xl:p-20 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent">
                    {/* Grid overlay */}
                    <div className="hero-grid absolute inset-0 pointer-events-none opacity-20" />

                    <div className="max-w-md">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                            </span>
                            INDUSTRIAL EXCELLENCE
                        </div>

                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
                            Selamat Datang di Masa Depan Manufaktur
                        </h1>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Akses workspace Anda dan lanjutkan membuat parts berkualitas tinggi dengan presisi industrial-grade.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
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
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Masuk</h2>
                        <p className="text-slate-500">Selamat datang kembali! Silakan masukkan detail Anda.</p>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-900">Lanjutkan dengan Google</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center mb-8">
                        <div className="flex-grow border-t border-slate-100" />
                        <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Atau masuk dengan email</span>
                        <div className="flex-grow border-t border-slate-100" />
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2" htmlFor="email">
                                Alamat Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="nama@perusahaan.com"
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-200 text-white rounded-xl transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest" htmlFor="password">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-xs font-bold text-primary hover:text-cyber-violet transition-colors">
                                    Lupa Password?
                                </Link>
                            </div>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-200 text-white rounded-xl transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                {...register("password")}
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="remember"
                                type="checkbox"
                                className="w-4 h-4 text-primary bg-white border-slate-200 rounded focus:ring-primary focus:ring-offset-0"
                            />
                            <label htmlFor="remember" className="text-sm text-slate-500 font-medium">
                                Ingat saya selama 30 hari
                            </label>
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
                                    Masuk
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Register Link */}
                    <p className="mt-10 text-center text-sm text-slate-500">
                        Belum punya akun?{" "}
                        <Link href="/register" className="text-primary font-bold hover:text-cyber-violet transition-colors">
                            Daftar
                        </Link>
                    </p>

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

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
