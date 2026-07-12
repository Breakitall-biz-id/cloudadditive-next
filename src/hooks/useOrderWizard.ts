"use client"

import { useState, useCallback, useEffect } from "react"
import type {
    Area,
    Provider,
    ModelDimensions,
} from "@/types/order"
import { parseGcodeFile, isGcodeFile } from "@/lib/gcode-parser"

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

    // Step 3: Delivery
    const [addressMode, setAddressMode] = useState<'saved' | 'new'>('new')
    const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null)
    const [recipientName, setRecipientName] = useState("")
    const [recipientPhone, setRecipientPhone] = useState("")
    const [detailAddress, setDetailAddress] = useState("")
    const [selectedArea, setSelectedArea] = useState<Area | null>(null)
    const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null)
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
    }, [selectedMaterial, modelDimensions, slicedResult])

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
                const stats = await parseGcodeFile(file, selectedMaterial || 'pla')

                // Create a local URL for the uploaded G-code
                const gcodeUrl = URL.createObjectURL(file)

                // Auto-select detected material if available
                if (stats.material) {
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
    }, [file, selectedMaterial, selectedQuality])

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

    // Cost Calculation
    // Default settings (will be overridden by API later)
    const settings = {
        markupPercentage: 0.15,
        platformFeePercentage: 0.10,
        machineRatePerHour: 10000,
        estimatedPrintSpeed: 15000, // mm³/hour
        defaultInfillPercentage: 0.20,
    }

    // Get material data - for G-code, use selected material (which defaults to detected) or fallback
    const fileIsGcode = file ? isGcodeFile(file) : false
    const effectiveMaterial = selectedMaterial || 'pla'
    const materialData = effectiveMaterial
        ? ({
            pla: { pricePerGram: 250, density: 1.24 },
            abs: { pricePerGram: 300, density: 1.04 },
            petg: { pricePerGram: 350, density: 1.27 },
            tpu: { pricePerGram: 450, density: 1.21 },
        } as Record<string, { pricePerGram: number; density: number }>)[effectiveMaterial]
        : null

    // Get quality multiplier - for G-code, use normal (1.0x) since quality is embedded
    const qualityMultiplier = fileIsGcode
        ? 1.0
        : selectedQuality
            ? ({ draft: 0.8, normal: 1.0, fine: 1.3 } as Record<string, number>)[selectedQuality] || 1.0
            : 1.0

    // Calculate costs - prioritize slicedResult data if available
    let materialCost = 0
    let timeCost = 0

    if (slicedResult && slicedResult.filamentGrams > 0) {
        // Use actual data from sliced result or parsed G-code
        const filamentWeight = slicedResult.filamentGrams
        const printTimeHours = slicedResult.printTimeMinutes / 60

        // Material cost = weight × price per gram × quantity
        materialCost = materialData
            ? Math.round(filamentWeight * materialData.pricePerGram * quantity)
            : 0

        // Time cost = print hours × machine rate × quantity
        timeCost = Math.round(printTimeHours * settings.machineRatePerHour * quantity)
    } else if (modelDimensions?.volume && modelDimensions.volume > 0) {
        // Fallback: estimate from volume for STL files not yet sliced
        const volumeMM3 = modelDimensions.volume
        const volumeCM3 = volumeMM3 / 1000

        // Estimated weight = volume × infill × density
        const estimatedWeight = materialData
            ? volumeCM3 * settings.defaultInfillPercentage * materialData.density
            : 0

        // Material cost = weight × price per gram × quality multiplier × quantity
        materialCost = materialData
            ? Math.round(estimatedWeight * materialData.pricePerGram * qualityMultiplier * quantity)
            : 0

        // Time cost = (volume / print speed) × machine rate × quality multiplier
        const estimatedHours = volumeMM3 / settings.estimatedPrintSpeed * qualityMultiplier
        timeCost = Math.round(estimatedHours * settings.machineRatePerHour * quantity)
    }

    // Subtotal
    const subtotal = materialCost + timeCost

    // Markup (for provider)
    const markup = Math.round(subtotal * settings.markupPercentage)

    // Platform fee
    const platformFee = Math.round(subtotal * settings.platformFeePercentage)

    // Shipping cost (from selected courier)
    const selectedCourierData = courierRates.find(c => c.id === selectedCourier)
    const shippingCost = selectedCourierData?.price || 0

    // Total
    const total = subtotal + markup + platformFee + shippingCost

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
            quantity,
            addressMode,
            selectedSavedAddressId,
            recipientName,
            recipientPhone,
            detailAddress,
            selectedArea,
            customerCoords,
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
            materialCost,
            timeCost,
            subtotal,
            markup,
            platformFee,
            shippingCost,
            total,
            nextStepName: getNextStepName(),
        },
    }
}

export type UseOrderWizardReturn = ReturnType<typeof useOrderWizard>
