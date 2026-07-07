"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type TimelineStatus = "completed" | "current" | "pending"

interface TimelineItemData {
    status: TimelineStatus
    title: string
    time: string
}

interface OrderTimelineProps {
    items: TimelineItemData[]
    isLive?: boolean
}

export function OrderTimeline({ items, isLive = false }: OrderTimelineProps) {
    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col shadow-sm card-shadow h-full">
            <h3 className="text-lg font-bold mb-6 flex items-center justify-between text-slate-900">
                Order Timeline
                {isLive && (
                    <span className="text-primary text-[10px] font-mono tracking-wider font-bold bg-primary/10 px-2 py-0.5 rounded">LIVE</span>
                )}
            </h3>

            {items.length > 0 ? (
                <div className="space-y-6 flex-1">
                    {items.map((item, idx) => (
                        <TimelineItem
                            key={`${item.title}-${idx}`}
                            status={item.status}
                            title={item.title}
                            time={item.time}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-center text-slate-400 text-sm">
                    No active order yet.
                </div>
            )}
        </div>
    )
}

function TimelineItem({ status, title, time }: { status: TimelineStatus, title: string, time: string }) {
    return (
        <div className={cn("flex gap-4", status === "pending" && "opacity-40")}>
            <div className="flex flex-col items-center">
                <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    status === "completed" && "bg-primary",
                    status === "current" && "border-2 border-primary relative",
                    status === "pending" && "border-2 border-slate-200"
                )}>
                    {status === "completed" && <Check className="w-3.5 h-3.5 text-white font-bold" strokeWidth={3} />}
                    {status === "current" && <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>}
                </div>
                {/* Line connector - simplified logic, in real list check if last */}
                <div className={cn(
                    "w-0.5 h-full my-1",
                    status === "completed" ? "bg-primary/20" : "bg-slate-100"
                )}></div>
            </div>
            <div className="pb-2">
                <p className={cn(
                    "text-xs font-bold",
                    status === "current" ? "text-primary" : "text-slate-900"
                )}>{title}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{time}</p>
            </div>
        </div>
    )
}
