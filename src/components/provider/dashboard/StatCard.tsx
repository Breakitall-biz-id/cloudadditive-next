"use client"

import { ReactNode } from "react"

interface StatCardProps {
    title: string
    value: string | number
    subtitle?: string
    trend?: {
        value: string
        direction: "up" | "down" | "neutral"
    }
    icon: ReactNode
}

export function StatCard({ title, value, subtitle, trend, icon }: StatCardProps) {
    const trendColor = {
        up: "text-primary",
        down: "text-red-500",
        neutral: "text-slate-400"
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {title}
                </p>
                <div className="text-primary bg-primary/10 p-1.5 rounded-lg">
                    {icon}
                </div>
            </div>
            <h3 className="text-3xl font-bold">
                {value}
                {subtitle && (
                    <span className="text-sm text-slate-400 font-normal ml-2">
                        {subtitle}
                    </span>
                )}
            </h3>
            {trend && (
                <p className={`text-sm font-medium mt-2 flex items-center gap-1 ${trendColor[trend.direction]}`}>
                    {trend.direction === "up" && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    )}
                    {trend.direction === "down" && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                    )}
                    {trend.value}
                </p>
            )}
        </div>
    )
}
