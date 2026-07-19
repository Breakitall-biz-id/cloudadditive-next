"use client"

import { useState, useCallback, useEffect } from "react"
import type {
    Area,
    Provider,
    ModelDimensions,
    CatalogData,
} from "@/types/order"
import { parseGcodeFile, isGcodeFile } from "@/lib/gcode-parser"
import { calculateOrderPricing } from "@/lib/order-pricing"

export function useOrderWizard() {
    // Step
    const [currentStep, setCurrentStep] = useState(1)

    // Step 1: Upload
    const [file, setFile] = useState<File | null>(null)
    const [modelDimensions, setModelDimensions] = useState<ModelDimensions | null>(null)

    // Step 2: Configure
    const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
    const [selectedQuality, setSelectedQuality] = useState<string | null>(null)
    const [selectedColor, setSelectedColor] = useState<string | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [catalog, setCatalog] = useState<CatalogData | null>(null)
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)

    // Step 3: Delivery
    const [addressMode, setAddressMode] = useState<'saved' | 'new'>('new')
    const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null)
    const [recipientName, setRecipientName] = useState("")
    const [recipientPhone, setRecipientPhone] = useState("")
    const [detailAddress, setDetailAddress] = useState("")
    const [selectedArea, setSelectedArea] = useState<Area | null>(null)
    const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [dueDate, setDueDate] = useState("")
    const [nearestProvider, setNearestProvider] = useState<Provider | null>(null)
    const [isSearchingProvider, setIsSearchingProvider] = useState(false)
    const [mapsLoaded, setMapsLoaded] = useState(false)

    // Step 3: Printer Pre-Check
    const [selectedPrinter, setSelectedPrinter] = useState<{
        printerId: string
        printerName: string
        providerId: string
        providerName: string
        providerCity: string
        providerProvince: string
        isVerified: boolean
        coordinates: { lat: number; lng: number }
        score: number
        canPrintImmediately: boolean
        queuedOrders: number
        status: string
        breakdown?: {
            distanceScore: number
            distanceKm: number
            queueTimeScore: number
            queueTimeMinutes: number
            materialMatchScore: number
            materialMatch: boolean
        }
    } | null>(null)
    const [printerSearchError, setPrinterSearchError] = useState<string | null>(null)
    const [isSearchingPrinter, setIsSearchingPrinter] = useState(false)

    // Step 4: Courier
    const [selectedCourier, setSelectedCourier] = useState<string | null>(null)
    const [courierRates, setCourierRates] = useState<Array<{
        id: string
        courierCode: string
        courierName: string
        serviceCode: string
        serviceName: string
        serviceType: string
        description: string
        duration: string
        durationUnit: string
        price: number
        type: string
    }>>([])
    const [isLoadingRates, setIsLoadingRates] = useState(false)

    // Step 5: Slicing Results (from slicer service or parsed G-code)
    const [isSlicing, setIsSlicing] = useState(false)
    const [slicingError, setSlicingError] = useState<string | null>(null)
    const [slicedResult, setSlicedResult] = useState<{
        printTimeMinutes: number
        filamentGrams: number
        layerCount: number
        gcodeUrl: string
        source: 'sliced' | 'uploaded'
        slicer?: string | null
        flavor?: string | null
        material?: string | null  // Detected material from G-code
    } | null>(null)

    // UI State
    const [showPreviewModal, setShowPreviewModal] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function loadCatalog() {
            try {
                const response = await fetch("/api/catalog")
                const data = await response.json()
                if (!cancelled) {
                    setCatalog(data)
                    setSelectedMaterial((current) => current ?? data.materials?.[0]?.id ?? null)
                    setSelectedQuality((current) => current ?? data.qualities?.[0]?.id ?? null)
                }
            } catch (error) {
                console.error("Catalog load error:", error)
            } finally {
                if (!cancelled) setIsLoadingCatalog(false)
            }
        }
        loadCatalog()
        return () => {
            cancelled = true
        }
    }, [])

    // Actions
    const goNext = useCallback(() => {
        setCurrentStep(prev => Math.min(6, prev + 1))
    }, [])

    const goBack = useCallback(() => {
        setCurrentStep(prev => Math.max(1, prev - 1))
    }, [])

    // Custom setFile that resets related state
    const setFileWithReset = useCallback((newFile: File | null) => {
        setFile(newFile)
        // Reset slicing results and model dimensions when file changes
        setSlicedResult(null)
        setSlicingError(null)
        setModelDimensions(null)
    }, [])

    const searchNearestProvider = useCallback(async (lat: number, lng: number) => {
        setIsSearchingProvider(true)
        try {
            const response = await fetch("/api/providers/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat, lng, materialId: selectedMaterial }),
            })
            const data = await response.json()
            if (data.nearestProvider) {
                setNearestProvider(data.nearestProvider)
            }
        } catch (error) {
            console.error("Provider search error:", error)
        } finally {
            setIsSearchingProvider(false)
        }
    }, [selectedMaterial])

    // Find best printer BEFORE order creation (for accurate shipping cost)
    const findBestPrinterPreCheck = useCallback(async (lat: number, lng: number) => {
        setIsSearchingPrinter(true)
        setPrinterSearchError(null)
        setSelectedPrinter(null)

        try {
            const response = await fetch("/api/orders/pre-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    materialId: selectedMaterial,
                    modelWidth: modelDimensions?.width,
                    modelHeight: modelDimensions?.height,
                    modelDepth: modelDimensions?.depth,
                    customerLat: lat,
                    customerLng: lng,
                    estimatedPrintTime: slicedResult?.printTimeMinutes,
                    quantity,
                    dueDate: dueDate || undefined,
                }),
            })
            const data = await response.json()

            if (data.success && data.bestPrinter) {
                setSelectedPrinter(data.bestPrinter)
                // Also set nearestProvider for backward compatibility
                setNearestProvider({
                    id: data.bestPrinter.providerId,
                    businessName: data.bestPrinter.providerName,
                    distance: data.bestPrinter.breakdown?.distanceKm || 0,
                    distanceUnit: "km",
                    isWithinRadius: true,
                    serviceRadius: 50,
                    rating: 0,
                    totalOrders: 0,
                    isVerified: data.bestPrinter.isVerified,
                    availablePrinters: 1,
                    totalPrinters: 1,
                    queueEstimate: data.bestPrinter.queuedOrders * 30,
                    city: data.bestPrinter.providerCity,
                    province: data.bestPrinter.providerProvince,
                    coordinates: data.bestPrinter.coordinates,
                })
            } else {
                setPrinterSearchError(data.error || "No compatible printers found")
                setNearestProvider(null)
            }
        } catch (error) {
            console.error("Printer pre-check error:", error)
            setPrinterSearchError("Failed to check printer availability")
        } finally {
            setIsSearchingPrinter(false)
        }
    }, [selectedMaterial, modelDimensions, quantity, slicedResult, dueDate])

    // Select saved address and auto-fill delivery fields
    const selectSavedAddress = useCallback((address: {
        id: string
        label: string
        recipientName: string
        phone: string
        street: string
        city: string
        province: string
        postalCode: string
        latitude: number | null
        longitude: number | null
    }) => {
        setSelectedSavedAddressId(address.id)
        setRecipientName(address.recipientName)
        setRecipientPhone(address.phone)
        setDetailAddress(address.street)

        // Reconstruct Area object from address data
        setSelectedArea({
            id: `${address.city}-${address.postalCode}`,
            name: address.city,
            postalCode: address.postalCode,
            administrativeLevel: {
                country: 'Indonesia',
                province: address.province,
                city: address.city,
                district: '', // Not stored in address
            },
        })

        // Set coordinates and trigger printer search
        if (address.latitude && address.longitude) {
            setCustomerCoords({ lat: address.latitude, lng: address.longitude })
            findBestPrinterPreCheck(address.latitude, address.longitude)
        }
    }, [findBestPrinterPreCheck])

    // Fetch courier rates from Biteship using lat/lng
    const fetchCourierRates = useCallback(async (
        originLat: number,
        originLng: number,
        destLat: number,
        destLng: number
    ) => {
        setIsLoadingRates(true)
        setCourierRates([])
        setSelectedCourier(null)
        try {
            const response = await fetch("/api/shipping/rates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    originLatitude: originLat,
                    originLongitude: originLng,
                    destinationLatitude: destLat,
                    destinationLongitude: destLng,
                }),
            })
            const data = await response.json()
            if (data.success && data.rates) {
                setCourierRates(data.rates)
            }
        } catch (error) {
            console.error("Courier rates error:", error)
        } finally {
            setIsLoadingRates(false)
        }
    }, [])

    // Slice the STL file or parse G-code to get print time and filament usage
    const sliceModel = useCallback(async () => {
        if (!file) {
            return
        }

        setIsSlicing(true)
        setSlicingError(null)
        setSlicedResult(null)

        try {
            // Check if file is a G-code file
            if (isGcodeFile(file)) {
                // Parse G-code directly - no need to slice
                const stats = await parseGcodeFile(file, selectedMaterial || catalog?.materials[0]?.id || "")

                // Create a local URL for the uploaded G-code
                const gcodeUrl = URL.createObjectURL(file)

                // Auto-select detected material if available
                if (stats.material && catalog?.materials.some((material) => material.id === stats.material)) {
                    setSelectedMaterial(stats.material)
                }

                setSlicedResult({
                    printTimeMinutes: stats.printTimeMinutes,
                    filamentGrams: stats.filamentGrams,
                    layerCount: stats.layerCount,
                    gcodeUrl: gcodeUrl,
                    source: 'uploaded',
                    slicer: stats.slicer,
                    flavor: stats.flavor,
                    material: stats.material,
                })
            } else {
                // STL/OBJ file - send to slicer service
                if (!selectedMaterial || !selectedQuality) {
                    setSlicingError('Please select material and quality first')
                    return
                }

                const formData = new FormData()
                formData.append("stl", file)
                formData.append("material", selectedMaterial)
                formData.append("quality", selectedQuality)
                formData.append("infill", "0.20") // Default infill

                const response = await fetch("/api/slicer/slice", {
                    method: "POST",
                    body: formData,
                })

                const data = await response.json()

                if (data.success && data.result) {
                    setSlicedResult({
                        printTimeMinutes: data.result.printTimeMinutes,
                        filamentGrams: data.result.filamentGrams,
                        layerCount: data.result.layerCount,
                        gcodeUrl: data.result.gcodeUrl,
                        source: 'sliced',
                    })
                } else {
                    setSlicingError(data.error || "Slicing failed")
                }
            }
        } catch (error) {
            console.error("Slicing/parsing error:", error)
            setSlicingError("Failed to process file")
        } finally {
            setIsSlicing(false)
        }
    }, [file, selectedMaterial, selectedQuality, catalog])

    // Auto-parse G-code files when uploaded (so pricing is available immediately)
    useEffect(() => {
        if (file && isGcodeFile(file) && !slicedResult && !isSlicing) {
            sliceModel()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]) // Only trigger when file changes, sliceModel handles the rest


    // Computed Values
    const canProceed = useCallback(() => {
        const fileIsGcode = file ? isGcodeFile(file) : false
        switch (currentStep) {
            case 1: return file !== null
            case 2: return fileIsGcode || (selectedMaterial && selectedQuality)  // G-code skips material/quality
            case 3: return selectedArea && recipientName && recipientPhone && selectedPrinter !== null
            case 4: return selectedCourier !== null
            default: return true
        }
    }, [currentStep, file, selectedMaterial, selectedQuality, selectedArea, recipientName, recipientPhone, selectedPrinter, selectedCourier])

    const fileIsGcode = file ? isGcodeFile(file) : false
    const selectedCourierData = courierRates.find(c => c.id === selectedCourier)
    const pricing = calculateOrderPricing({
        material: catalog?.materials.find((material) => material.id === selectedMaterial) ?? null,
        quality: catalog?.qualities.find((quality) => quality.id === selectedQuality) ?? null,
        settings: catalog?.settings ?? {
            markupPercentage: 0,
            platformFeePercentage: 0,
            machineRatePerHour: 0,
            estimatedPrintSpeed: 1,
            defaultInfillPercentage: 0,
        },
        quantity,
        shippingCost: selectedCourierData?.price || 0,
        modelVolumeMm3: modelDimensions?.volume,
        slicedResult,
        isGcode: fileIsGcode,
    })

    const getNextStepName = useCallback(() => {
        const steps = [
            { id: 1, name: "Upload" },
            { id: 2, name: "Configure" },
            { id: 3, name: "Delivery" },
            { id: 4, name: "Courier" },
            { id: 5, name: "Review" },
            { id: 6, name: "Payment" },
        ]
        const nextStep = steps.find(s => s.id === currentStep + 1)
        return nextStep?.name || "Complete"
    }, [currentStep])

    // Return state, actions, and computed values
    return {
        // State
        state: {
            currentStep,
            file,
            modelDimensions,
            selectedMaterial,
            selectedQuality,
            selectedColor,
            catalog,
            isLoadingCatalog,
            quantity,
            addressMode,
            selectedSavedAddressId,
            recipientName,
            recipientPhone,
            detailAddress,
            selectedArea,
            customerCoords,
            dueDate,
            nearestProvider,
            isSearchingProvider,
            mapsLoaded,
            selectedPrinter,
            printerSearchError,
            isSearchingPrinter,
            selectedCourier,
            courierRates,
            isLoadingRates,
            isSlicing,
            slicingError,
            slicedResult,
            showPreviewModal,
        },

        // Actions
        actions: {
            setCurrentStep,
            goNext,
            goBack,
            setFile: setFileWithReset, // Use wrapper that resets related state
            setModelDimensions,
            setSelectedMaterial,
            setSelectedQuality,
            setSelectedColor,
            setQuantity,
            setAddressMode,
            selectSavedAddress,
            setRecipientName,
            setRecipientPhone,
            setDetailAddress,
            setSelectedArea,
            setCustomerCoords,
            setDueDate,
            setNearestProvider,
            setIsSearchingProvider,
            setMapsLoaded,
            searchNearestProvider,
            findBestPrinterPreCheck,
            setSelectedCourier,
            fetchCourierRates,
            sliceModel,
            setShowPreviewModal,
        },

        // Computed
        computed: {
            canProceed: canProceed(),
            materialCost: pricing.materialCost,
            timeCost: pricing.timeCost,
            subtotal: pricing.subtotal,
            markup: pricing.markup,
            platformFee: pricing.platformFee,
            shippingCost: pricing.shippingCost,
            total: pricing.total,
            nextStepName: getNextStepName(),
        },
    }
}

export type UseOrderWizardReturn = ReturnType<typeof useOrderWizard>
