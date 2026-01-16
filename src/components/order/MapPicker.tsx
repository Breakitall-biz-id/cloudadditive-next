"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface Area {
    id: string
    name: string
    postalCode: string
    administrativeLevel: {
        country: string
        province: string
        city: string
        district: string
    }
}

interface MapPickerProps {
    onLocationSelect: (location: {
        lat: number
        lng: number
        address: string
        area?: Area
    }) => void
    defaultLat?: number
    defaultLng?: number
}

export default function MapPicker({ onLocationSelect, defaultLat = -7.7956, defaultLng = 110.3695 }: MapPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Use refs for Google Maps objects to avoid closure issues
    const mapRef = useRef<google.maps.Map | null>(null)
    const markerRef = useRef<google.maps.Marker | null>(null)

    const [isMapReady, setIsMapReady] = useState(false)
    const [currentAddress, setCurrentAddress] = useState("")
    const [selectedArea, setSelectedArea] = useState<Area | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const [currentPosition, setCurrentPosition] = useState({ lat: defaultLat, lng: defaultLng })

    // Validate address with Biteship API
    const validateWithBiteship = useCallback(async (address: string, lat: number, lng: number) => {
        if (!address || address.length < 3) return

        setIsValidating(true)
        setSelectedArea(null)

        try {
            const response = await fetch(`/api/shipping/areas?input=${encodeURIComponent(address)}`)
            const data = await response.json()

            if (data.areas && data.areas.length > 0) {
                const area = data.areas[0]
                setSelectedArea(area)

                onLocationSelect({
                    lat,
                    lng,
                    address,
                    area,
                })
            }
        } catch (error) {
            console.error("Biteship validation error:", error)
        } finally {
            setIsValidating(false)
        }
    }, [onLocationSelect])

    // Move map to new location
    const moveMapTo = useCallback((lat: number, lng: number) => {
        if (mapRef.current && markerRef.current) {
            const newPos = new google.maps.LatLng(lat, lng)
            mapRef.current.setCenter(newPos)
            mapRef.current.setZoom(17)
            markerRef.current.setPosition(newPos)
            setCurrentPosition({ lat, lng })
        }
    }, [])

    // Handle position change (reverse geocode + validate)
    const handlePositionChange = useCallback(async (lat: number, lng: number) => {
        try {
            const geocoder = new google.maps.Geocoder()
            const response = await geocoder.geocode({ location: { lat, lng } })

            if (response.results[0]) {
                const address = response.results[0].formatted_address
                setCurrentAddress(address)

                if (searchInputRef.current) {
                    searchInputRef.current.value = address
                }

                await validateWithBiteship(address, lat, lng)
            }
        } catch (error) {
            console.error("Geocoding error:", error)
        }
    }, [validateWithBiteship])

    // Initialize Google Maps
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return

        const initMap = async () => {
            try {
                const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary
                const { Marker } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary

                const map = new Map(mapContainerRef.current!, {
                    center: { lat: defaultLat, lng: defaultLng },
                    zoom: 15,
                    mapId: "cloudadditive-map",
                    disableDefaultUI: true,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                })

                const marker = new Marker({
                    position: { lat: defaultLat, lng: defaultLng },
                    map: map,
                    draggable: true,
                    title: "Delivery Location",
                })

                // Store in refs
                mapRef.current = map
                markerRef.current = marker

                // Handle marker drag end
                marker.addListener("dragend", () => {
                    const position = marker.getPosition()
                    if (position) {
                        const lat = position.lat()
                        const lng = position.lng()
                        setCurrentPosition({ lat, lng })
                        handlePositionChange(lat, lng)
                    }
                })

                // Handle map click
                map.addListener("click", (e: google.maps.MapMouseEvent) => {
                    if (e.latLng) {
                        const lat = e.latLng.lat()
                        const lng = e.latLng.lng()
                        marker.setPosition(e.latLng)
                        setCurrentPosition({ lat, lng })
                        handlePositionChange(lat, lng)
                    }
                })

                setIsMapReady(true)
            } catch (error) {
                console.error("Error initializing map:", error)
            }
        }

        if (typeof google !== "undefined" && google.maps) {
            initMap()
        }
    }, [defaultLat, defaultLng, handlePositionChange])

    // Initialize Google Places Autocomplete
    useEffect(() => {
        if (!searchInputRef.current || !isMapReady) return

        const initAutocomplete = async () => {
            try {
                const { Autocomplete } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary

                const autocomplete = new Autocomplete(searchInputRef.current!, {
                    componentRestrictions: { country: "id" },
                    fields: ["formatted_address", "geometry", "address_components"],
                    types: ["geocode", "establishment"],
                })

                autocomplete.addListener("place_changed", () => {
                    const place = autocomplete.getPlace()

                    if (place.geometry?.location) {
                        const lat = place.geometry.location.lat()
                        const lng = place.geometry.location.lng()

                        // Move map and marker using refs (not closure)
                        moveMapTo(lat, lng)

                        setCurrentAddress(place.formatted_address || "")

                        // Validate with Biteship
                        validateWithBiteship(place.formatted_address || "", lat, lng)
                    }
                })
            } catch (error) {
                console.error("Error initializing autocomplete:", error)
            }
        }

        if (typeof google !== "undefined" && google.maps) {
            initAutocomplete()
        }
    }, [isMapReady, moveMapTo, validateWithBiteship])

    // Get current location
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude
                    const lng = position.coords.longitude

                    moveMapTo(lat, lng)
                    handlePositionChange(lat, lng)
                },
                (error) => {
                    console.error("Geolocation error:", error)
                }
            )
        }
    }

    return (
        <div className="space-y-4">
            {/* Google Places Autocomplete Search */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Cari alamat atau klik pada peta..."
                        className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        search
                    </span>
                </div>
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
                    title="Gunakan lokasi saya"
                >
                    <span className="material-symbols-outlined text-slate-600">my_location</span>
                </button>
            </div>

            {/* Map Container */}
            <div
                ref={mapContainerRef}
                className="aspect-video w-full rounded-xl border border-slate-200 bg-slate-100"
                style={{ minHeight: "300px" }}
            />

            {/* Validation Status */}
            {isValidating && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-slate-600">Memvalidasi alamat dengan Biteship...</span>
                </div>
            )}

            {/* Selected Area Info */}
            {selectedArea && !isValidating && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                        <div className="flex-1">
                            <p className="font-bold text-slate-900 text-sm">Area Tervalidasi</p>
                            <p className="text-xs text-slate-600 mt-1">{selectedArea.name}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
                                    {selectedArea.administrativeLevel.province}
                                </span>
                                <span className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
                                    {selectedArea.administrativeLevel.city}
                                </span>
                                <span className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
                                    {selectedArea.administrativeLevel.district}
                                </span>
                                <span className="px-2 py-1 rounded bg-primary/10 text-xs text-primary font-bold">
                                    {selectedArea.postalCode}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning if no area found */}
            {currentAddress && !selectedArea && !isValidating && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                    <span className="material-symbols-outlined text-amber-500">warning</span>
                    <div>
                        <p className="text-sm font-medium text-amber-700">Area tidak ditemukan di Biteship</p>
                        <p className="text-xs text-amber-600 mt-1">Coba geser pin ke lokasi yang lebih spesifik atau pilih alamat lain.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
