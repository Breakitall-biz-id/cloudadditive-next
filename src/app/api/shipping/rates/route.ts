import { NextRequest, NextResponse } from "next/server"

const BITESHIP_API_URL = "https://api.biteship.com/v1"

interface BiteshipRateItem {
    available_for_cash_on_delivery: boolean
    available_for_proof_of_delivery: boolean
    available_for_instant_waybill_id: boolean
    available_for_insurance: boolean
    company: string
    courier_name: string
    courier_code: string
    courier_service_name: string
    courier_service_code: string
    description: string
    duration: string
    shipment_duration_range: string
    shipment_duration_unit: string
    service_type: string
    shipping_type: string
    price: number
    type: string
}

interface BiteshipRatesResponse {
    success: boolean
    object: string
    message: string
    code: number
    origin: object
    destination: object
    pricing: BiteshipRateItem[]
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            originLatitude,
            originLongitude,
            destinationLatitude,
            destinationLongitude,
            items = [
                {
                    name: "3D Print Order",
                    description: "3D printed item",
                    value: 100000,
                    weight: 500, // 500 grams default
                    quantity: 1,
                }
            ],
            couriers = "jne,sicepat,anteraja,gojek,grab,jnt"
        } = body

        if (!originLatitude || !originLongitude || !destinationLatitude || !destinationLongitude) {
            return NextResponse.json(
                { error: "Origin and destination coordinates are required" },
                { status: 400 }
            )
        }

        const apiKey = process.env.BITESHIP_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: "Biteship API key not configured" },
                { status: 500 }
            )
        }

        // Call Biteship API for rates using lat/lng (like filament-cp)
        const response = await fetch(`${BITESHIP_API_URL}/rates/couriers`, {
            method: "POST",
            headers: {
                "Authorization": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                origin_latitude: originLatitude,
                origin_longitude: originLongitude,
                destination_latitude: destinationLatitude,
                destination_longitude: destinationLongitude,
                couriers: couriers,
                items: items
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Biteship rates error:", errorText)
            return NextResponse.json(
                { error: "Failed to fetch shipping rates", details: errorText },
                { status: response.status }
            )
        }

        const data: BiteshipRatesResponse = await response.json()

        if (!data.success) {
            return NextResponse.json(
                { error: data.message || "Failed to get rates" },
                { status: 400 }
            )
        }

        // Transform and sort rates by price
        const rates = data.pricing
            .map((rate) => ({
                id: `${rate.courier_code}-${rate.courier_service_code}`,
                courierCode: rate.courier_code,
                courierName: rate.courier_name,
                serviceCode: rate.courier_service_code,
                serviceName: rate.courier_service_name,
                serviceType: rate.service_type,
                description: rate.description,
                duration: rate.shipment_duration_range || rate.duration,
                durationUnit: rate.shipment_duration_unit || "days",
                price: rate.price,
                type: rate.type,
                insuranceAvailable: rate.available_for_insurance,
                codAvailable: rate.available_for_cash_on_delivery,
            }))
            .sort((a, b) => a.price - b.price)

        return NextResponse.json({
            success: true,
            rates,
            totalRates: rates.length,
            origin: data.origin,
            destination: data.destination,
        })
    } catch (error) {
        console.error("Shipping rates error:", error)
        return NextResponse.json(
            { error: "Failed to fetch shipping rates" },
            { status: 500 }
        )
    }
}
