"use client"

import { SessionProvider } from "next-auth/react"

interface ProvidersProps {
    children: React.ReactNode
}

import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            {children}
            <Toaster />
        </SessionProvider>
    )
}
