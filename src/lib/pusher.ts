import Pusher from "pusher"

// Server-side Pusher instance for triggering events
export const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
})

// Helper to trigger events to a printer
export async function triggerPrinterEvent(
    printerId: string,
    event: string,
    data: any
) {
    const channel = `private-printer-${printerId}`
    console.log(`[Pusher Server] Triggering ${event} on ${channel}`)
    await pusherServer.trigger(channel, event, data)
}

// Helper to trigger events to a provider's dashboard
export async function triggerProviderEvent(
    providerId: string,
    event: string,
    data: any
) {
    const channel = `private-provider-${providerId}`
    console.log(`[Pusher Server] Triggering ${event} on ${channel}`, { providerId, event })
    await pusherServer.trigger(channel, event, data)
}

// Event types for type safety
export type PrinterCommand =
    | { type: "job:start"; jobId: string; gcodeUrl: string; filename: string }
    | { type: "job:pause"; jobId: string }
    | { type: "job:resume"; jobId: string }
    | { type: "job:cancel"; jobId: string }
    | { type: "ping" }

export type PrinterStatus = {
    printerId: string
    state: "idle" | "printing" | "paused" | "error" | "offline"
    progress?: number
    temps?: {
        hotend?: number
        tool0?: number
        bed: number
    }
    currentJob?: {
        id: string
        filename: string
        timeRemaining: number
    }
    webcamUrl?: string
}
