"use client"

import { useEffect, useState, useCallback } from "react"
import { getPusherClient } from "@/lib/pusher-client"
import type { Channel } from "pusher-js"

export interface PrinterStatusData {
    printerId: string
    state: "idle" | "printing" | "paused" | "error" | "offline"
    progress?: number
    temps?: {
        hotend: number
        bed: number
    }
    currentJob?: {
        id: string
        filename: string
        timeRemaining: number
    }
    webcamUrl?: string | null
    timestamp?: string
    lastSeenAt?: string
}

interface UsePrinterStatusOptions {
    providerId: string
    onStatusUpdate?: (status: PrinterStatusData) => void
}

/**
 * Hook for subscribing to real-time printer status updates via Pusher.
 * 
 * Usage:
 * ```tsx
 * const { printerStatuses, isConnected } = usePrinterStatus({
 *   providerId: "cuid123",
 * })
 * 
 * // Access status for a specific printer
 * const myPrinterStatus = printerStatuses["printer-id-here"]
 * ```
 */
export function usePrinterStatus({ providerId, onStatusUpdate }: UsePrinterStatusOptions) {
    const [printerStatuses, setPrinterStatuses] = useState<Record<string, PrinterStatusData>>({})
    const [isConnected, setIsConnected] = useState(false)
    const [channel, setChannel] = useState<Channel | null>(null)

    const handleStatusUpdate = useCallback((data: PrinterStatusData) => {
        setPrinterStatuses(prev => ({
            ...prev,
            [data.printerId]: data
        }))
        onStatusUpdate?.(data)
    }, [onStatusUpdate])

    useEffect(() => {
        if (!providerId) return

        const pusher = getPusherClient()
        const channelName = `private-provider-${providerId}`

        console.log(`[Pusher] Subscribing to channel: ${channelName}`)

        // Subscribe to provider channel
        const providerChannel = pusher.subscribe(channelName)
        setChannel(providerChannel)

        // Listen for printer status events
        providerChannel.bind("printer:status", (data: PrinterStatusData) => {
            console.log("[Pusher] Received printer:status event:", data)
            handleStatusUpdate(data)
        })

        // Connection state
        pusher.connection.bind("connected", () => {
            console.log("[Pusher] Connected")
            setIsConnected(true)
        })
        pusher.connection.bind("disconnected", () => {
            console.log("[Pusher] Disconnected")
            setIsConnected(false)
        })

        // Check if already connected
        if (pusher.connection.state === "connected") {
            console.log("[Pusher] Already connected")
            setIsConnected(true)
        }

        return () => {
            console.log(`[Pusher] Unsubscribing from channel: ${channelName}`)
            providerChannel.unbind("printer:status", handleStatusUpdate)
            pusher.unsubscribe(channelName)
        }
    }, [providerId, handleStatusUpdate])

    // Helper to get status for a specific printer
    const getStatus = useCallback((printerId: string): PrinterStatusData | null => {
        return printerStatuses[printerId] || null
    }, [printerStatuses])

    return {
        printerStatuses,
        getStatus,
        isConnected,
        channel,
    }
}

/**
 * Hook for subscribing to a single printer's status.
 * Useful when you only need to track one printer.
 */
export function useSinglePrinterStatus(providerId: string, printerId: string) {
    const { getStatus, isConnected } = usePrinterStatus({ providerId })
    const [status, setStatus] = useState<PrinterStatusData | null>(null)

    useEffect(() => {
        const printerStatus = getStatus(printerId)
        if (printerStatus) {
            setStatus(printerStatus)
        }
    }, [getStatus, printerId])

    return { status, isConnected }
}
