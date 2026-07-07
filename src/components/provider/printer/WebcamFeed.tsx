"use client"

import { useState, useRef, useEffect } from "react"
import { Video, VideoOff, Maximize2, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface WebcamFeedProps {
    webcamUrl: string | null
    printerName: string
    isExpanded?: boolean
    onToggleExpand?: () => void
    className?: string
}

export function WebcamFeed({
    webcamUrl,
    printerName,
    isExpanded = false,
    onToggleExpand,
    className
}: WebcamFeedProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)

    // Reset loading state when URL changes
    useEffect(() => {
        setIsLoading(true)
        setHasError(false)
    }, [webcamUrl])

    if (!webcamUrl) {
        return (
            <div className={cn(
                "flex items-center justify-center bg-slate-100 rounded-lg text-slate-400",
                className
            )}>
                <div className="text-center p-4">
                    <VideoOff className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs">No webcam configured</p>
                </div>
            </div>
        )
    }

    const handleLoad = () => {
        setIsLoading(false)
        setHasError(false)
    }

    const handleError = () => {
        setIsLoading(false)
        setHasError(true)
    }

    return (
        <>
            <div className={cn(
                "relative bg-slate-900 rounded-lg overflow-hidden group",
                className
            )}>
                {/* Loading indicator */}
                {isLoading && !hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <div className="animate-pulse flex flex-col items-center text-slate-400">
                            <Video className="w-8 h-8 mb-2" />
                            <p className="text-xs">Loading stream...</p>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <div className="flex flex-col items-center text-red-400">
                            <AlertCircle className="w-8 h-8 mb-2" />
                            <p className="text-xs">Stream unavailable</p>
                            <button
                                onClick={() => {
                                    setHasError(false)
                                    setIsLoading(true)
                                }}
                                className="mt-2 text-xs text-primary hover:underline"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Webcam stream (MJPEG) */}
                <img
                    ref={imgRef}
                    src={webcamUrl}
                    alt={`${printerName} webcam`}
                    className={cn(
                        "w-full h-full object-cover",
                        (isLoading || hasError) && "opacity-0"
                    )}
                    onLoad={handleLoad}
                    onError={handleError}
                />

                {/* Controls overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-white font-medium">Live</span>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            <Maximize2 className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Fullscreen Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setShowModal(false)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        onClick={() => setShowModal(false)}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <div className="max-w-4xl max-h-[80vh] w-full">
                        <img
                            src={webcamUrl}
                            alt={`${printerName} webcam fullscreen`}
                            className="w-full h-full object-contain rounded-lg"
                        />
                        <p className="text-white text-center mt-4 font-medium">{printerName}</p>
                    </div>
                </div>
            )}
        </>
    )
}
