"use client"

import { useState, useCallback } from "react"
import type { Area } from "@/types/order"

export interface ProviderRegistrationState {
    // Step 1: Identity & Location
    businessName: string
    businessType: "Individual" | "CV/PT" | "Enterprise" | ""
    businessNumber: string // NIB
    streetAddress: string
    province: string
    city: string
    postalCode: string
    latitude: number
    longitude: number

    // Step 2: Capacity
    primaryTechnology: string
    printerCount: number
    supportedMaterials: string[]

    // Step 3: Logistics (Final)
    shippingEnabled: boolean
    pickupEnabled: boolean
    supportedCouriers: string[]
    leadTime: string
}

// Initial state
const INITIAL_STATE: ProviderRegistrationState = {
    businessName: "",
    businessType: "",
    businessNumber: "",
    streetAddress: "",
    province: "",
    city: "",
    postalCode: "",
    latitude: -6.9175,
    longitude: 107.6191,
    primaryTechnology: "",
    printerCount: 0,
    supportedMaterials: [],

    shippingEnabled: true,
    pickupEnabled: false,
    supportedCouriers: [],
    leadTime: "3-5",
}

export function useProviderWizard() {
    const [currentStep, setCurrentStep] = useState(1)
    const [state, setState] = useState<ProviderRegistrationState>(INITIAL_STATE)
    const [selectedArea, setSelectedArea] = useState<Area | null>(null)
    const [mapsLoaded, setMapsLoaded] = useState(false)

    // Actions
    const setBusinessName = (val: string) => setState(s => ({ ...s, businessName: val }))
    const setBusinessType = (val: string) => setState(s => ({ ...s, businessType: val as any }))
    const setBusinessNumber = (val: string) => setState(s => ({ ...s, businessNumber: val }))
    const setStreetAddress = (val: string) => setState(s => ({ ...s, streetAddress: val }))
    const setProvince = (val: string) => setState(s => ({ ...s, province: val }))
    const setCity = (val: string) => setState(s => ({ ...s, city: val }))
    const setPostalCode = (val: string) => setState(s => ({ ...s, postalCode: val }))
    const setCoordinates = (lat: number, lng: number) => setState(s => ({ ...s, latitude: lat, longitude: lng }))

    // Step 2 Actions
    const setPrimaryTechnology = (val: string) => setState(s => ({ ...s, primaryTechnology: val }))
    const setPrinterCount = (val: number) => setState(s => ({ ...s, printerCount: val }))
    const toggleSupportedMaterial = (material: string) => setState(s => {
        const hasMaterial = s.supportedMaterials.includes(material)
        return {
            ...s,
            supportedMaterials: hasMaterial
                ? s.supportedMaterials.filter(m => m !== material)
                : [...s.supportedMaterials, material]
        }
    })

    const goNext = useCallback(() => {
        // Here we could add validation before proceeding
        setCurrentStep(prev => Math.min(4, prev + 1))
    }, [])

    const goBack = useCallback(() => {
        setCurrentStep(prev => Math.max(1, prev - 1))
    }, [])

    // Computed validation
    const canProceed = () => {
        if (currentStep === 1) {
            return !!(state.businessName && state.businessType && state.streetAddress && state.city && state.province)
        }
        if (currentStep === 2) {
            return !!(state.primaryTechnology && state.printerCount > 0 && state.supportedMaterials.length > 0)
        }
        if (currentStep === 3) {
            // Must have at least one fulfillment method
            const hasFulfillment = state.shippingEnabled || state.pickupEnabled
            // If shipping enabled, must select courier
            const validShipping = state.shippingEnabled ? state.supportedCouriers.length > 0 : true

            return hasFulfillment && validShipping && !!state.leadTime
        }
        return true
    }

    return {
        state: { ...state, currentStep, selectedArea, mapsLoaded },
        actions: {
            setBusinessName,
            setBusinessType,
            setBusinessNumber,
            setStreetAddress,
            setProvince,
            setCity,
            setPostalCode,
            setCoordinates,
            setSelectedArea,
            setMapsLoaded,

            // Step 2
            setPrimaryTechnology,
            setPrinterCount,
            toggleSupportedMaterial,

            // Step 3 Actions
            setShippingEnabled: (val: boolean) => setState(s => ({ ...s, shippingEnabled: val })),
            setPickupEnabled: (val: boolean) => setState(s => ({ ...s, pickupEnabled: val })),
            setLeadTime: (val: string) => setState(s => ({ ...s, leadTime: val })),
            toggleSupportedCourier: (courier: string) => setState(s => {
                const hasCourier = s.supportedCouriers.includes(courier)
                return {
                    ...s,
                    supportedCouriers: hasCourier
                        ? s.supportedCouriers.filter(c => c !== courier)
                        : [...s.supportedCouriers, courier]
                }
            }),

            goNext,
            goBack,
        },
        computed: {
            canProceed: canProceed()
        }
    }
}

// Logic update needed for canProceed, doing it in a separate block for clarity or combined here if possible. 
// Actually I need to update the canProceed function implementation which is earlier in the file.
// I will just return the actions here and update canProceed in a separate tool call to avoid large context replacements if it lets me.
// Wait, I can do it in one go if I include the whole file or strategic chunks. 
// I'll do actions here.

export type UseProviderWizardReturn = ReturnType<typeof useProviderWizard>
