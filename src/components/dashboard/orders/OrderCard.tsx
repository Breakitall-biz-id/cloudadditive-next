"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Star } from "lucide-react"
import { submitOrderReview } from "@/actions/customer-orders"

interface OrderCardProps {
    databaseId: string
    orderId: string
    date: string
    dueDate: string | null
    total: string
    status: string
    projectImage: string
    projectName: string
    material: string
    quantity: string
    providerName: string | null
    review: {
        rating: number
        comment: string | null
        createdAt: string
    } | null
}

export function OrderCard({
    databaseId,
    orderId,
    date,
    dueDate,
    total,
    status,
    projectImage,
    projectName,
    material,
    quantity,
    providerName,
    review,
}: OrderCardProps) {
    const [rating, setRating] = useState(review?.rating ?? 5)
    const [comment, setComment] = useState(review?.comment ?? "")
    const [savedReview, setSavedReview] = useState(review)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
    const [isPending, startTransition] = useTransition()

    const normalizedStatus = status.toUpperCase()
    const canReview = normalizedStatus === "COMPLETED" && !savedReview

    // Helper to get status colors
    const getStatusColor = (value: string) => {
        const s = value.toUpperCase()
        if (s === "DELIVERED" || s === "COMPLETED") {
            return "bg-emerald-100 text-emerald-700 border-emerald-200"
        }
        if (s === "SHIPPED") {
            return "bg-amber-100 text-amber-700 border-amber-200"
        }
        if (s === "CANCELLED" || s === "REFUNDED" || s === "PAYMENT_FAILED") {
            return "bg-red-100 text-red-700 border-red-200"
        }
        return "bg-blue-100 text-blue-700 border-blue-200"
    }

    function handleSubmitReview() {
        if (!canReview || isPending) return

        setFeedback(null)
        startTransition(async () => {
            const result = await submitOrderReview({ orderId: databaseId, rating, comment })
            if (result.success) {
                setSavedReview({ rating, comment: comment.trim() || null, createdAt: new Date().toISOString() })
                setFeedback({ type: "success", message: "Review berhasil disimpan." })
                return
            }
            setFeedback({ type: "error", message: result.error || "Gagal menyimpan review." })
        })
    }

    return (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden card-shadow">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                        <p className="font-mono text-primary font-bold">{orderId}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Placed</p>
                        <p className="text-sm font-semibold text-slate-700">{date}</p>
                    </div>
                    {dueDate && (
                        <>
                            <div className="h-8 w-px bg-slate-200"></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Needed By</p>
                                <p className="text-sm font-semibold text-slate-700">{dueDate}</p>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Price</p>
                        <p className="text-sm font-bold text-slate-900">{total}</p>
                    </div>
                    <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border",
                        getStatusColor(status)
                    )}>
                        {status}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-32 aspect-square rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0 relative">
                    <Image
                        src={projectImage}
                        alt="Project Preview"
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Name</p>
                        <p className="text-base font-bold text-slate-900">{projectName}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Material</p>
                        <p className="text-sm font-medium text-slate-700">{material}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                        <p className="text-sm font-medium text-slate-700">{quantity}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Provider</p>
                        <p className="text-sm font-medium text-slate-700">{providerName || "—"}</p>
                    </div>
                    <div className="flex items-center justify-end">
                        {normalizedStatus === "SHIPPED" ? (
                            <button className="px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-bold text-sm hover:bg-orange-50 transition-colors">
                                Track Order
                            </button>
                        ) : (
                            <button className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                                View Details
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {(canReview || savedReview || feedback) && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-6">
                    {savedReview ? (
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your Review</p>
                                <div className="flex items-center gap-1 text-amber-500">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <Star key={index} className={cn("h-4 w-4", index < savedReview.rating ? "fill-current" : "text-slate-300")} />
                                    ))}
                                </div>
                                {savedReview.comment && <p className="mt-2 text-sm text-slate-700">{savedReview.comment}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rate this order</p>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, index) => {
                                        const value = index + 1
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setRating(value)}
                                                className="rounded-md p-1 text-amber-500 transition-colors hover:bg-amber-50"
                                                aria-label={`${value} stars`}
                                            >
                                                <Star className={cn("h-5 w-5", value <= rating ? "fill-current" : "text-slate-300")} />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Comment</label>
                                <textarea
                                    rows={2}
                                    value={comment}
                                    onChange={(event) => setComment(event.target.value)}
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                                    placeholder="Bagikan pengalaman Anda dengan provider ini..."
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSubmitReview}
                                disabled={isPending}
                                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {isPending ? "Menyimpan..." : "Submit Review"}
                            </button>
                        </div>
                    )}
                    {feedback && (
                        <p className={cn("mt-3 text-xs font-semibold", feedback.type === "success" ? "text-emerald-700" : "text-red-600")}>{feedback.message}</p>
                    )}
                </div>
            )}
        </div>
    )
}
