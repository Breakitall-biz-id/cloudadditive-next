"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Script from "next/script"
import {
    Building2,
    Cpu,
    Wallet,
    Save,
    Check,
    Loader2,
    MapPin,
    ShieldCheck,
    FileText
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    updateProviderBusinessInfo,
    updateProviderCapabilities,
    updateProviderBankAccount
} from "@/actions/settings"
import { cn } from "@/lib/utils"

// Dynamic import MapPicker to avoid SSR issues
const MapPicker = dynamic(() => import("@/components/order/MapPicker"), {
    ssr: false,
    loading: () => (
        <div className="aspect-[2/1] w-full rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center">
            <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-slate-200 mx-auto mb-3 flex items-center justify-center animate-pulse">
                    <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">Loading map...</p>
            </div>
        </div>
    ),
})

// Types
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

interface SettingsData {
    businessName: string
    businessType: string
    businessNumber: string
    description: string
    street: string
    city: string
    province: string
    postalCode: string
    latitude: number | null
    longitude: number | null
    primaryTechnology: string
    supportedMaterials: string[]
    bankName: string
    bankAccountNumber: string
    bankAccountName: string
    isVerified: boolean
    logoUrl: string
}

interface SettingsClientProps {
    initialData: SettingsData
    materialOptions: string[]
}

type TabKey = "business" | "capabilities" | "payouts"

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "business", label: "Business Info", icon: <Building2 className="w-4 h-4" /> },
    { key: "capabilities", label: "Capabilities", icon: <Cpu className="w-4 h-4" /> },
    { key: "payouts", label: "Payouts", icon: <Wallet className="w-4 h-4" /> },
]

// Styles
const labelClassName = "text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block"
const inputClassName = "w-full h-12 px-4 rounded-xl border-slate-200 bg-white text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-none"
const readOnlyInputClassName = "w-full h-12 px-4 rounded-xl border-slate-100 bg-slate-50/50 text-slate-500 focus-visible:ring-0 cursor-default shadow-none"

// Constants
const TECHNOLOGIES = ["FDM", "SLA", "SLS", "MJF", "DMLS", "PolyJet"]
const BANKS = [
    "BCA", "Bank Mandiri", "BNI", "BRI", "CIMB Niaga",
    "Bank Danamon", "Bank Permata", "Jenius", "OCBC NISP",
    "Bank Mega", "Maybank", "Bank BTN", "Bank Jago", "SeaBank", "Bank Raya"
]
export function SettingsClient({ initialData, materialOptions }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("business")
    const [mapsLoaded, setMapsLoaded] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [selectedArea, setSelectedArea] = useState<Area | null>(null)

    // Business Info State
    const [businessName, setBusinessName] = useState(initialData.businessName)
    const [businessType, setBusinessType] = useState(initialData.businessType)
    const [businessNumber, setBusinessNumber] = useState(initialData.businessNumber)
    const [description, setDescription] = useState(initialData.description)
    const [street, setStreet] = useState(initialData.street)
    const [city, setCity] = useState(initialData.city)
    const [province, setProvince] = useState(initialData.province)
    const [postalCode, setPostalCode] = useState(initialData.postalCode)
    const [latitude, setLatitude] = useState<number | null>(initialData.latitude)
    const [longitude, setLongitude] = useState<number | null>(initialData.longitude)

    // Capabilities State
    const [primaryTechnology, setPrimaryTechnology] = useState(initialData.primaryTechnology)
    const [supportedMaterials, setSupportedMaterials] = useState<string[]>(initialData.supportedMaterials)

    // Payouts State
    const [bankName, setBankName] = useState(initialData.bankName)
    const [bankAccountNumber, setBankAccountNumber] = useState(initialData.bankAccountNumber)
    const [bankAccountName, setBankAccountName] = useState(initialData.bankAccountName)

    // Success animation timeout
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [showSuccess])

    // Save handlers
    const handleSaveBusinessInfo = async () => {
        setSaving(true)
        try {
            await updateProviderBusinessInfo({
                businessName,
                businessType,
                businessNumber,
                description,
                street,
                city,
                province,
                postalCode,
                latitude,
                longitude,
            })
            setShowSuccess(true)
        } catch (error) {
            console.error("Failed to save:", error)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveCapabilities = async () => {
        setSaving(true)
        try {
            await updateProviderCapabilities({
                primaryTechnology,
                supportedMaterials,
            })
            setShowSuccess(true)
        } catch (error) {
            console.error("Failed to save:", error)
        } finally {
            setSaving(false)
        }
    }

    const handleSavePayouts = async () => {
        setSaving(true)
        try {
            await updateProviderBankAccount({
                bankName,
                bankAccountNumber,
                bankAccountName,
            })
            setShowSuccess(true)
        } catch (error) {
            console.error("Failed to save:", error)
        } finally {
            setSaving(false)
        }
    }

    const toggleMaterial = (material: string) => {
        setSupportedMaterials(prev =>
            prev.includes(material)
                ? prev.filter(m => m !== material)
                : [...prev, material]
        )
    }

    const handleLocationSelect = (location: { lat: number; lng: number; address: string; area?: Area }) => {
        setLatitude(location.lat)
        setLongitude(location.lng)

        if (location.area) {
            setSelectedArea(location.area)
            setProvince(location.area.administrativeLevel.province)
            setCity(location.area.administrativeLevel.city)
            setPostalCode(location.area.postalCode)
        }
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your provider profile and payout information</p>
                </div>
                {initialData.isVerified && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                        <ShieldCheck className="w-4 h-4" />
                        Verified Provider
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1.5 bg-slate-100/80 rounded-2xl mb-8 w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                            activeTab === tab.key
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Business Info Tab */}
                {activeTab === "business" && (
                    <div className="p-8">
                        {/* Business Details Section */}
                        <div className="mb-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Business Information</h2>
                                    <p className="text-sm text-slate-500">Your company details and legal information</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClassName}>Business Name</label>
                                    <Input
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className={inputClassName}
                                        placeholder="e.g. Precision Prints Ltd."
                                    />
                                </div>
                                <div>
                                    <label className={labelClassName}>Business Type</label>
                                    <Select value={businessType} onValueChange={setBusinessType}>
                                        <SelectTrigger className={inputClassName}>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Individual">Individual</SelectItem>
                                            <SelectItem value="CV/PT">CV/PT</SelectItem>
                                            <SelectItem value="Enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className={labelClassName}>NIB (Business Number)</label>
                                    <Input
                                        value={businessNumber}
                                        onChange={(e) => setBusinessNumber(e.target.value)}
                                        className={cn(inputClassName, "font-mono")}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className={labelClassName}>Description</label>
                                    <Input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={inputClassName}
                                        placeholder="Brief description of your services"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="pt-8 border-t border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Location</h2>
                                    <p className="text-sm text-slate-500">Search or pick your location on the map</p>
                                </div>
                            </div>

                            {/* Map Picker */}
                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-6 mb-6">
                                <label className={labelClassName}>Location Search</label>
                                {mapsLoaded ? (
                                    <MapPicker
                                        defaultLat={latitude || -6.9175}
                                        defaultLng={longitude || 107.6191}
                                        onLocationSelect={handleLocationSelect}
                                    />
                                ) : (
                                    <div className="aspect-[2/1] w-full rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-200 mx-auto mb-3 flex items-center justify-center animate-pulse">
                                                <MapPin className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm text-slate-400">Loading Maps...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Address Fields */}
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClassName}>Street Address</label>
                                    <Textarea
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-none min-h-[100px] resize-none"
                                        placeholder="Jl. Industrial Way No. 42..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className={labelClassName}>Province</label>
                                        <Input
                                            value={selectedArea?.administrativeLevel.province || province}
                                            readOnly
                                            className={readOnlyInputClassName}
                                            placeholder="Auto-filled from map"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClassName}>City</label>
                                        <Input
                                            value={selectedArea?.administrativeLevel.city || city}
                                            readOnly
                                            className={readOnlyInputClassName}
                                            placeholder="Auto-filled from map"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClassName}>Postal Code</label>
                                        <Input
                                            value={selectedArea?.postalCode || postalCode}
                                            readOnly
                                            className={cn(readOnlyInputClassName, "font-mono")}
                                            placeholder="Auto-filled from map"
                                        />
                                    </div>
                                </div>

                                {!selectedArea && !latitude && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <MapPin className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <p className="text-sm text-amber-700">
                                            Search or pick a location on the map to auto-fill address details.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-8 mt-8 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSaveBusinessInfo}
                                disabled={saving}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200",
                                    showSuccess
                                        ? "bg-emerald-500 text-white"
                                        : "bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                                )}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : showSuccess ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Capabilities Tab */}
                {activeTab === "capabilities" && (
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                <Cpu className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Printing Capabilities</h2>
                                <p className="text-sm text-slate-500">Define your printing technologies and materials</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Primary Technology */}
                            <div>
                                <label className={labelClassName}>Primary Technology</label>
                                <div className="flex flex-wrap gap-3">
                                    {TECHNOLOGIES.map((tech) => (
                                        <button
                                            key={tech}
                                            onClick={() => setPrimaryTechnology(tech)}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                                                primaryTechnology === tech
                                                    ? "bg-primary text-white border-primary shadow-lg shadow-orange-500/20"
                                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            )}
                                        >
                                            {tech}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Supported Materials */}
                            <div>
                                <label className={labelClassName}>Supported Materials</label>
                                <p className="text-sm text-slate-500 mb-4">Select all materials you can print with</p>
                                <div className="flex flex-wrap gap-3">
                                    {materialOptions.map((material) => (
                                        <button
                                            key={material}
                                            onClick={() => toggleMaterial(material)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
                                                supportedMaterials.includes(material)
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            )}
                                        >
                                            {supportedMaterials.includes(material) && (
                                                <Check className="w-3.5 h-3.5 inline mr-1.5" />
                                            )}
                                            {material}
                                        </button>
                                    ))}
                                </div>
                                {materialOptions.length === 0 && (
                                    <p className="text-sm font-semibold text-red-600">No active materials are available in the admin catalog.</p>
                                )}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-8 mt-8 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSaveCapabilities}
                                disabled={saving}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200",
                                    showSuccess
                                        ? "bg-emerald-500 text-white"
                                        : "bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                                )}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : showSuccess ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Payouts Tab */}
                {activeTab === "payouts" && (
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Payout Settings</h2>
                                <p className="text-sm text-slate-500">Configure your bank account for receiving payments</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={labelClassName}>Bank Name</label>
                                <Select value={bankName} onValueChange={setBankName}>
                                    <SelectTrigger className={inputClassName}>
                                        <SelectValue placeholder="Select your bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BANKS.map((bank) => (
                                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClassName}>Account Number</label>
                                <Input
                                    value={bankAccountNumber}
                                    onChange={(e) => setBankAccountNumber(e.target.value)}
                                    className={cn(inputClassName, "font-mono")}
                                    placeholder="1234567890"
                                />
                            </div>
                            <div>
                                <label className={labelClassName}>Account Holder Name</label>
                                <Input
                                    value={bankAccountName}
                                    onChange={(e) => setBankAccountName(e.target.value)}
                                    className={inputClassName}
                                    placeholder="Name as shown on bank account"
                                />
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="mt-8 bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Payout Schedule</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Payouts are processed weekly every Monday. Minimum payout amount is Rp 50,000.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-8 mt-8 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSavePayouts}
                                disabled={saving}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200",
                                    showSuccess
                                        ? "bg-emerald-500 text-white"
                                        : "bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                                )}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : showSuccess ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Google Maps Script */}
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                onLoad={() => setMapsLoaded(true)}
                strategy="lazyOnload"
            />
        </div>
    )
}
