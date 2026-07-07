"use client"

import { useState } from "react"
import { X, Router as RouterIcon, Copy, Check, ExternalLink } from "lucide-react"
import { addPrinter } from "@/actions/printer"
import { toast } from "sonner"

interface AddPrinterModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AddPrinterModal({ isOpen, onClose }: AddPrinterModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [connectionToken, setConnectionToken] = useState<string>("")
    const [copiedToken, setCopiedToken] = useState(false)
    const [copiedUrl, setCopiedUrl] = useState(false)

    if (!isOpen) return null

    // Get server URL (development or production)
    const serverUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : 'http://localhost:3000'

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

    const handleClose = () => {
        setShowSuccess(false)
        setConnectionToken("")
        setCopiedToken(false)
        setCopiedUrl(false)
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const formData = new FormData(e.currentTarget)
            const data = {
                name: formData.get("name"),
                model: formData.get("model"),
                volumeX: formData.get("volumeX"),
                volumeY: formData.get("volumeY"),
                volumeZ: formData.get("volumeZ"),
                nozzle: formData.get("nozzle"),
                octoprintUrl: formData.get("octoprintUrl"),
                octoprintApiKey: formData.get("octoprintApiKey"),
            }

            const result = await addPrinter(data)

            if (result.error) {
                toast.error(result.error)
            } else if (result.connectionToken) {
                // Show success modal with token
                setConnectionToken(result.connectionToken)
                setShowSuccess(true)
            }
        } catch (error) {
            toast.error("Failed to add printer")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Success Modal
    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 m-4">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Printer Added Successfully!</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Configure your OctoPrint plugin to connect</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-6">
                        {/* Connection Token */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">key</span>
                                Connection Token
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={connectionToken}
                                    readOnly
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-900"
                                />
                                <button
                                    onClick={() => handleCopy(connectionToken, 'token')}
                                    className="px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copiedToken ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* Server URL */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">cloud</span>
                                Server URL
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={serverUrl}
                                    readOnly
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-900"
                                />
                                <button
                                    onClick={() => handleCopy(serverUrl, 'url')}
                                    className="px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copiedUrl ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
                            <h3 className="font-bold text-blue-900 flex items-center gap-2">
                                <span className="material-symbols-outlined">info</span>
                                Setup Instructions
                            </h3>
                            <ol className="space-y-2 text-sm text-blue-800">
                                <li className="flex gap-3">
                                    <span className="font-bold">1.</span>
                                    <span>Open OctoPrint and go to <strong>Settings → CloudPrint</strong></span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold">2.</span>
                                    <span>Paste the <strong>Server URL</strong> and <strong>Connection Token</strong> above</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold">3.</span>
                                    <span>Enable <strong>Auto Connect</strong> and click <strong>Save</strong></span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold">4.</span>
                                    <span>Click <strong>Test Connection</strong> to verify</span>
                                </li>
                            </ol>
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-sm text-amber-800 flex items-start gap-2">
                                <span className="material-symbols-outlined text-lg">warning</span>
                                <span><strong>Important:</strong> Save this token securely. You won't be able to see it again after closing this window.</span>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-slate-100 flex gap-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )
    }


    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 m-4">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Add New Printer</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Printer Name</label>
                            <input name="name" required className="w-full px-4 py-2 bg-slate-50 border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary text-slate-900 outline-none border transition-all" placeholder="e.g., Voron 2.4 - A3" type="text" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Model/Brand</label>
                            <select name="model" className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary text-slate-900 outline-none border transition-all">
                                <option>Voron Design</option>
                                <option>Prusa Research</option>
                                <option>Bambu Lab</option>
                                <option>Creality</option>
                                <option>Other / Custom</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Volume X</label>
                            <input name="volumeX" required className="w-full px-4 py-2 bg-slate-50 border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary text-slate-900 outline-none border transition-all" placeholder="250" type="number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Volume Y</label>
                            <input name="volumeY" required className="w-full px-4 py-2 bg-slate-50 border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary text-slate-900 outline-none border transition-all" placeholder="250" type="number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Volume Z</label>
                            <input name="volumeZ" required className="w-full px-4 py-2 bg-slate-50 border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary text-slate-900 outline-none border transition-all" placeholder="250" type="number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nozzle</label>
                            <input name="nozzle" required className="w-full px-4 py-2 bg-slate-50 border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary text-slate-900 outline-none border transition-all" placeholder="0.4" type="number" step="0.1" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Supported Materials</label>
                        <div className="flex flex-wrap gap-2">
                            {["PLA", "PETG", "ABS", "Nylon", "TPU"].map((mat) => (
                                <label key={mat} className="px-3 py-1.5 bg-slate-100 text-slate-500 has-[:checked]:bg-primary/10 has-[:checked]:text-primary text-xs font-bold rounded-full cursor-pointer hover:bg-slate-200 transition-colors">
                                    <input type="checkbox" className="hidden" /> {mat}
                                </label>
                            ))}
                        </div>
                    </div>


                    <div className="flex gap-4 pt-4 border-t border-slate-50">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : "Save Printer"}
                        </button>
                        <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-center transition-all">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
