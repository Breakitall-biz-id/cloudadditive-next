"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check, RefreshCw, AlertTriangle, Key, Server, Clock, Settings } from "lucide-react"

import { deletePrinter, updatePrinter, getPrinter, regenerateConnectionToken, getMaterials } from "@/actions/printer"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// ========== DELETE PRINTER MODAL ==========
interface DeletePrinterModalProps {
    isOpen: boolean
    onClose: () => void
    printer: { id: string; name: string }
}

export function DeletePrinterModal({ isOpen, onClose, printer }: DeletePrinterModalProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    if (!isOpen) return null

    const handleDelete = async () => {
        setIsDeleting(true)
        const result = await deletePrinter(printer.id)

        if (result.error) {
            toast.error(result.error)
            setIsDeleting(false)
        } else {
            toast.success("Printer deleted successfully")
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Delete Printer</h2>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-slate-600">
                        Are you sure you want to delete <strong>"{printer.name}"</strong>?
                        This action cannot be undone.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                            <strong>Warning:</strong> The connection token will be invalidated
                            and the printer will no longer be able to connect.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        {isDeleting ? "Deleting..." : "Delete Printer"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ========== EDIT PRINTER MODAL ==========
interface EditPrinterModalProps {
    isOpen: boolean
    onClose: () => void
    printer: {
        id: string
        name: string
        model: string
        buildWidth?: number
        buildDepth?: number
        buildHeight?: number
        isAcceptingOrders?: boolean
        preprocessingTime?: number
        currentMaterialId?: string | null
    }
}

export function EditPrinterModal({ isOpen, onClose, printer }: EditPrinterModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [materials, setMaterials] = useState<any[]>([])
    const [isAccepting, setIsAccepting] = useState(printer.isAcceptingOrders || false)

    useEffect(() => {
        if (isOpen) {
            getMaterials().then(res => {
                if (res.success && res.materials) {
                    setMaterials(res.materials)
                }
            })
            setIsAccepting(printer.isAcceptingOrders || false)
        }
    }, [isOpen, printer])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get("name"),
            model: formData.get("model"),
            volumeX: formData.get("volumeX"),
            volumeY: formData.get("volumeY"),
            volumeZ: formData.get("volumeZ"),
            isAcceptingOrders: isAccepting,
            currentMaterialId: formData.get("currentMaterialId"),
            preprocessingTime: formData.get("preprocessingTime"),
        }

        const result = await updatePrinter(printer.id, data)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Printer settings updated")
            onClose()
        }
        setIsSubmitting(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-slate-900">Printer Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Printer Name</label>
                            <input
                                name="name"
                                required
                                defaultValue={printer.name}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Model</label>
                            <Select name="model" defaultValue={printer.model}>
                                <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Voron Design">Voron Design</SelectItem>
                                    <SelectItem value="Prusa Research">Prusa Research</SelectItem>
                                    <SelectItem value="Bambu Lab">Bambu Lab</SelectItem>
                                    <SelectItem value="Creality">Creality</SelectItem>
                                    <SelectItem value="Other / Custom">Other / Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Build Volume */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Build Volume (mm)</label>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">X</span>
                                <input name="volumeX" type="number" required defaultValue={printer.buildWidth || 250} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none text-center" />
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">Y</span>
                                <input name="volumeY" type="number" required defaultValue={printer.buildDepth || 250} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none text-center" />
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">Z</span>
                                <input name="volumeZ" type="number" required defaultValue={printer.buildHeight || 250} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none text-center" />
                            </div>
                        </div>
                    </div>

                    {/* Readiness Configuration */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isAccepting ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <label className="text-sm font-bold text-slate-800">Auto-Accept Orders</label>
                                </div>
                                <p className="text-xs text-slate-500">Automatically start queued jobs matching loaded material</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAccepting(!isAccepting)}
                                className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-1 ${isAccepting ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-slate-300 focus:ring-slate-400'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-all ${isAccepting ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        {isAccepting && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                        Loaded Material <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    </label>
                                    <Select
                                        name="currentMaterialId"
                                        defaultValue={printer.currentMaterialId || ""}
                                        required={isAccepting}
                                    >
                                        <SelectTrigger className="w-full bg-white border-slate-200">
                                            <SelectValue placeholder="Select Material..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {materials.map(m => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.name} ({m.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Prep Time (min)</label>
                                    <input
                                        name="preprocessingTime"
                                        type="number"
                                        min="0"
                                        defaultValue={printer.preprocessingTime || 10}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? "Saving..." : "Save Configuration"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ========== PRINTER DETAILS MODAL (View Token) ==========
interface PrinterDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    printerId: string
    printerName: string
}

export function PrinterDetailsModal({ isOpen, onClose, printerId, printerName }: PrinterDetailsModalProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [printerData, setPrinterData] = useState<any>(null)
    const [copiedToken, setCopiedToken] = useState(false)
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [isRegenerating, setIsRegenerating] = useState(false)

    const serverUrl = typeof window !== 'undefined' ? window.location.origin : ''

    // Load printer details when modal opens
    useEffect(() => {
        if (isOpen && printerId) {
            setIsLoading(true)
            getPrinter(printerId).then((result) => {
                if (result.error) {
                    toast.error(result.error)
                    onClose()
                } else {
                    setPrinterData(result.printer)
                }
                setIsLoading(false)
            })
        }
    }, [isOpen, printerId])

    if (!isOpen) return null

    const handleCopy = async (text: string, type: 'token' | 'url') => {
        await navigator.clipboard.writeText(text)
        if (type === 'token') {
            setCopiedToken(true)
            setTimeout(() => setCopiedToken(false), 2000)
        } else {
            setCopiedUrl(true)
            setTimeout(() => setCopiedUrl(false), 2000)
        }
        toast.success("Copied to clipboard!")
    }

    const handleRegenerateToken = async () => {
        setIsRegenerating(true)
        const result = await regenerateConnectionToken(printerId)

        if (result.error) {
            toast.error(result.error)
        } else {
            setPrinterData({ ...printerData, connectionToken: result.connectionToken })
            toast.success("Connection token regenerated! Update your OctoPrint plugin.")
        }
        setIsRegenerating(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{printerName}</h2>
                        <p className="text-sm text-slate-500">Connection Details</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="p-6 space-y-5">
                        {/* Connection Token */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <Key className="w-4 h-4 text-primary" />
                                Connection Token
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={printerData?.connectionToken || ""}
                                    readOnly
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-600"
                                />
                                <button
                                    onClick={() => handleCopy(printerData?.connectionToken, 'token')}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    {copiedToken ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-slate-600" />}
                                </button>
                            </div>
                        </div>

                        {/* Server URL */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <Server className="w-4 h-4 text-primary" />
                                Server URL
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={serverUrl}
                                    readOnly
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-600"
                                />
                                <button
                                    onClick={() => handleCopy(serverUrl, 'url')}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    {copiedUrl ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-slate-600" />}
                                </button>
                            </div>
                        </div>

                        {/* Last Seen */}
                        {printerData?.lastSeenAt && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Clock className="w-4 h-4" />
                                <span>Last connected: {new Date(printerData.lastSeenAt).toLocaleString()}</span>
                            </div>
                        )}

                        {/* Regenerate Token Button */}
                        <button
                            onClick={handleRegenerateToken}
                            disabled={isRegenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-slate-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                            {isRegenerating ? "Regenerating..." : "Regenerate Token"}
                        </button>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs text-amber-800">
                                After regenerating the token, you'll need to update the
                                connection settings in your OctoPrint plugin.
                            </p>
                        </div>
                    </div>
                )}

                <div className="px-6 py-4 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
