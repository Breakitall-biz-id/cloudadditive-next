"use client"

import Pusher from "pusher-js"

// Client-side Pusher instance (singleton)
let pusherClient: Pusher | null = null

export function getPusherClient(): Pusher {
    if (!pusherClient) {
        // Enable Pusher logging in development
        if (process.env.NODE_ENV === "development") {
            Pusher.logToConsole = true
        }

        pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            // Auth endpoint for private channels
            authEndpoint: "/api/pusher/auth",
        })

        // Log all connection state changes
        pusherClient.connection.bind("state_change", (states: { previous: string; current: string }) => {
            console.log(`[Pusher] Connection state: ${states.previous} → ${states.current}`)
        })

        // Log errors
        pusherClient.connection.bind("error", (err: Error) => {
            console.error("[Pusher] Connection error:", err)
        })

        // Log successful connection with socket ID
        pusherClient.connection.bind("connected", () => {
            console.log(`[Pusher] Connected! Socket ID: ${pusherClient?.connection.socket_id}`)
        })
    }
    return pusherClient
}

// Hook-friendly channel subscription
export function subscribeToChannel(channelName: string) {
    const pusher = getPusherClient()
    return pusher.subscribe(channelName)
}

export function unsubscribeFromChannel(channelName: string) {
    const pusher = getPusherClient()
    pusher.unsubscribe(channelName)
}
