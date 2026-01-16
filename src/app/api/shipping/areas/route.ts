import { NextRequest, NextResponse } from "next/server"

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || ""
const BITESHIP_BASE_URL = "https://api.biteship.com/v1"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const input = searchParams.get("input")

    if (!input || input.length < 3) {
        return NextResponse.json({ areas: [] })
    }

    try {
        const response = await fetch(
            `${BITESHIP_BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(input)}&type=single`,
            {
                headers: {
                    Authorization: `Bearer ${BITESHIP_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        )

        if (!response.ok) {
            console.error("Biteship API error:", await response.text())
            return NextResponse.json({ areas: [], error: "Failed to fetch areas" }, { status: 500 })
        }

        const data = await response.json()

        // Transform Biteship response
        // Biteship v1 API levels for Indonesia:
        // level_1 = Province (e.g., Bangka Belitung, DI Yogyakarta)
        // level_2 = City/Kabupaten (e.g., Bangka, Sleman)
        // level_3 = District/Kecamatan (e.g., Mendo Barat, Ngemplak)
        const areas = data.areas?.map((area: any) => ({
            id: area.id,
            name: area.name,
            postalCode: String(area.postal_code || ""),
            administrativeLevel: {
                country: area.country_name || "Indonesia",
                province: area.administrative_division_level_1_name || "",
                city: area.administrative_division_level_2_name || "",
                district: area.administrative_division_level_3_name || "",
            },
        })) || []

        return NextResponse.json({ areas })
    } catch (error) {
        console.error("Biteship search error:", error)
        return NextResponse.json({ areas: [], error: "Internal server error" }, { status: 500 })
    }
}


