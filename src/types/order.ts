export interface Material {
    id: string
    name: string
    pricePerGram: number  // IDR per gram
    density: number       // g/cm³
}

export interface Color {
    id: string
    name: string
    hex: string
}

export interface Quality {
    id: string
    name: string
    multiplier: number
    layerHeight: number  // mm
}

export interface Area {
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

export interface Provider {
    id: string
    businessName: string
    ownerName: string
    distance: number
    distanceUnit: string
    isWithinRadius: boolean
    rating: number
    totalOrders: number
    isVerified: boolean
    availablePrinters: number
    totalPrinters: number
    queueEstimate: number
    city: string
    province: string
}

export interface ModelDimensions {
    width: number
    height: number
    depth: number
    volume: number  // mm³
}

export interface Courier {
    id: string
    name: string
    service: string
    duration: string
    price: number
    logo: string
}

export interface OrderStep {
    id: number
    name: string
    icon: string
}

export interface SystemSettings {
    markupPercentage: number
    platformFeePercentage: number
    machineRatePerHour: number
    estimatedPrintSpeed: number
    defaultInfillPercentage: number
}

// Order Wizard State
export interface OrderWizardState {
    // Step
    currentStep: number

    // Step 1: Upload
    file: File | null
    modelDimensions: ModelDimensions | null

    // Step 2: Configure
    selectedMaterial: string | null
    selectedQuality: string | null
    selectedColor: string | null
    quantity: number

    // Step 3: Delivery
    recipientName: string
    recipientPhone: string
    detailAddress: string
    selectedArea: Area | null
    customerCoords: { lat: number; lng: number } | null
    nearestProvider: Provider | null
    isSearchingProvider: boolean
    mapsLoaded: boolean

    // Step 4: Courier
    selectedCourier: string | null

    // UI State
    showPreviewModal: boolean
}

export interface OrderWizardActions {
    // Navigation
    setCurrentStep: (step: number) => void
    goNext: () => void
    goBack: () => void

    // Step 1
    setFile: (file: File | null) => void
    setModelDimensions: (dims: ModelDimensions | null) => void

    // Step 2
    setSelectedMaterial: (id: string | null) => void
    setSelectedQuality: (id: string | null) => void
    setSelectedColor: (id: string | null) => void
    setQuantity: (qty: number) => void

    // Step 3
    setRecipientName: (name: string) => void
    setRecipientPhone: (phone: string) => void
    setDetailAddress: (address: string) => void
    setSelectedArea: (area: Area | null) => void
    setCustomerCoords: (coords: { lat: number; lng: number } | null) => void
    setNearestProvider: (provider: Provider | null) => void
    setIsSearchingProvider: (searching: boolean) => void
    setMapsLoaded: (loaded: boolean) => void
    searchNearestProvider: (lat: number, lng: number) => Promise<void>

    // Step 4
    setSelectedCourier: (id: string | null) => void

    // UI
    setShowPreviewModal: (show: boolean) => void
}

export interface OrderWizardComputed {
    canProceed: boolean
    materialCost: number
    timeCost: number
    subtotal: number
    markup: number
    platformFee: number
    shippingCost: number
    total: number
    nextStepName: string
}

// Static Data
export const ORDER_STEPS: OrderStep[] = [
    { id: 1, name: "Upload", icon: "upload_file" },
    { id: 2, name: "Configure", icon: "settings" },
    { id: 3, name: "Delivery", icon: "local_shipping" },
    { id: 4, name: "Courier", icon: "package_2" },
    { id: 5, name: "Review", icon: "rate_review" },
    { id: 6, name: "Payment", icon: "payments" },
]

export const MATERIALS: Material[] = [
    { id: "pla", name: "PLA", pricePerGram: 250, density: 1.24 },
    { id: "abs", name: "ABS", pricePerGram: 300, density: 1.04 },
    { id: "petg", name: "PETG", pricePerGram: 350, density: 1.27 },
    { id: "tpu", name: "TPU Flex", pricePerGram: 450, density: 1.21 },
]

export const COLORS: Color[] = [
    { id: "white", name: "White", hex: "#ffffff" },
    { id: "black", name: "Black", hex: "#1a1a1a" },
    { id: "red", name: "Red", hex: "#ef4444" },
    { id: "blue", name: "Blue", hex: "#3b82f6" },
    { id: "green", name: "Green", hex: "#22c55e" },
    { id: "orange", name: "Orange", hex: "#f97316" },
]

export const QUALITIES: Quality[] = [
    { id: "draft", name: "Draft (0.3mm)", multiplier: 0.8, layerHeight: 0.3 },
    { id: "standard", name: "Standard (0.2mm)", multiplier: 1.0, layerHeight: 0.2 },
    { id: "high", name: "High (0.12mm)", multiplier: 1.3, layerHeight: 0.12 },
    { id: "ultra", name: "Ultra (0.08mm)", multiplier: 1.6, layerHeight: 0.08 },
]

export const COURIERS: Courier[] = [
    { id: "jne-reg", name: "JNE", service: "REG", duration: "2-3 days", price: 15000, logo: "/couriers/jne.png" },
    { id: "sicepat-reg", name: "SiCepat", service: "REG", duration: "2-3 days", price: 14000, logo: "/couriers/sicepat.png" },
    { id: "anteraja-reg", name: "AnterAja", service: "REG", duration: "2-3 days", price: 13000, logo: "/couriers/anteraja.png" },
    { id: "gosend-instant", name: "GoSend", service: "Instant", duration: "Same day", price: 25000, logo: "/couriers/gosend.png" },
]
