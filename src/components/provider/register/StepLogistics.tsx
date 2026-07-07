"use client"

import { ArrowRight, ArrowLeft, Check, Truck, Store, Clock } from "lucide-react"
import type { UseProviderWizardReturn } from "@/hooks/useProviderWizard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerProvider } from "@/actions/provider"
import { useState } from "react"
import { toast } from "sonner"
// Or adapt based on what I find. If I can't find it, I'll check package.json again. 
// package.json has "sonner": "^2.0.7". So it might be "sonner".
// But StepLogistics code used `useToast` and `toast` object. 
// Let's wait for find results.
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface StepProps {
    wizard: UseProviderWizardReturn
}

export function StepLogistics({ wizard }: StepProps) {
    const { state, actions, computed } = wizard

    // Standard input style (from StepIdentity/Capacity)
    // Using !h-12 w-full bg-white to ensure consistency with other steps
    const inputClassName = "w-full !h-12 px-4 rounded-xl border-slate-200 bg-white text-base md:text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-none"
    const labelClassName = "text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block"

    // Custom toggle style based on HTML snippet
    const ToggleSwitch = ({
        label,
        description,
        checked,
        onChange
    }: {
        label: string,
        description: string,
        checked: boolean,
        onChange: (val: boolean) => void
    }) => (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
            <div>
                <span className="text-sm font-bold text-slate-700 block">{label}</span>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
        </div>
    )

    // Courier Card
    const CourierCard = ({ name, colorClass, checked, onChange }: { name: string, colorClass: string, checked: boolean, onChange: () => void }) => (
        <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all text-center group bg-white ${checked ? 'border-primary ring-1 ring-primary/20 bg-orange-50/10' : 'border-slate-200 hover:border-primary'
            }`}>
            <input
                type="checkbox"
                className="hidden"
                checked={checked}
                onChange={onChange}
            />
            <div className={`w-full h-8 flex items-center justify-center mb-2 transition-all ${checked ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-80'
                }`}>
                <span className={`font-black italic tracking-tighter ${colorClass}`}>{name}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-slate-300'
                    }`}>
                    {checked && <Check className="w-2 h-2 text-white" />}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${checked ? 'text-primary' : 'text-slate-400 group-hover:text-primary'
                    }`}>
                    Select
                </span>
            </div>
        </label>
    )

    // Submit Handler
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()
    const { update } = useSession()

    const handleSubmit = async () => {
        if (!computed.canProceed) return

        setIsSubmitting(true)
        try {
            const formData = {
                ...state
            }

            const result = await registerProvider(formData)

            if (result.error) {
                toast.error("Registration Failed", {
                    description: result.error,
                })
            } else if (result.success) {
                // Update session to reflect new role
                await update({ role: "PROVIDER" })

                toast.success("Registration Successful!", {
                    description: "Welcome to the network. Redirecting to dashboard...",
                    className: "bg-emerald-600 text-white border-none"
                })
                // Allow toast to be seen
                setTimeout(() => {
                    router.push("/provider/dashboard")
                }, 1500)
            }
        } catch (error) {
            toast.error("Error", {
                description: "Something went wrong. Please try again.",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-2xl animate-fade-in">
            <div className="mb-12">
                <div className="flex justify-between mb-4">
                    <span className="text-sm font-bold text-primary font-mono uppercase tracking-wider">FINAL STEP</span>
                    <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Logistics & Shipping</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: "100%" }}></div>
                </div>
            </div>

            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Final Step: Logistics & Shipping</h2>
                    <p className="text-slate-500 mt-1">Set up how you will deliver printed parts to customers.</p>
                </div>

                <div className="space-y-8">
                    {/* Fulfillment Methods */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ToggleSwitch
                            label="Shipping Enabled"
                            description="Deliver via couriers"
                            checked={state.shippingEnabled}
                            onChange={actions.setShippingEnabled}
                        />
                        <ToggleSwitch
                            label="Pickup Enabled"
                            description="Customers come to you"
                            checked={state.pickupEnabled}
                            onChange={actions.setPickupEnabled}
                        />
                    </div>

                    {!state.shippingEnabled && !state.pickupEnabled && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 animate-pulse">
                            <span className="material-symbols-outlined text-red-500 text-sm font-bold">error</span>
                            <p className="text-sm text-red-700 font-medium">Please enable at least one fulfillment method.</p>
                        </div>
                    )}

                    {/* Couriers (Only show if shipping enabled) */}
                    <div className={`space-y-4 transition-all duration-300 ${state.shippingEnabled ? 'opacity-100 max-h-[500px]' : 'opacity-40 max-h-none pointer-events-none grayscale'}`}>
                        <div className="flex justify-between items-center">
                            <span className={labelClassName}>Supported Couriers</span>
                            {state.shippingEnabled && state.supportedCouriers.length === 0 && (
                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-pulse">Select at least one</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <CourierCard
                                name="JNE"
                                colorClass="text-blue-900"
                                checked={state.supportedCouriers.includes('JNE')}
                                onChange={() => actions.toggleSupportedCourier('JNE')}
                            />
                            <CourierCard
                                name="J&T"
                                colorClass="text-red-600"
                                checked={state.supportedCouriers.includes('J&T')}
                                onChange={() => actions.toggleSupportedCourier('J&T')}
                            />
                            <CourierCard
                                name="SiCepat"
                                colorClass="text-red-500"
                                checked={state.supportedCouriers.includes('SiCepat')}
                                onChange={() => actions.toggleSupportedCourier('SiCepat')}
                            />
                            <CourierCard
                                name="GoSend"
                                colorClass="text-green-600"
                                checked={state.supportedCouriers.includes('GoSend')}
                                onChange={() => actions.toggleSupportedCourier('GoSend')}
                            />
                        </div>
                    </div>

                    {/* Lead Time */}
                    <label className="block">
                        <span className={labelClassName}>Average Lead Time</span>
                        <div className="relative">
                            <Select
                                value={state.leadTime}
                                onValueChange={actions.setLeadTime}
                            >
                                <SelectTrigger className={inputClassName}>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <SelectValue placeholder="Select estimated time" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1-2">1-2 Business Days (Express)</SelectItem>
                                    <SelectItem value="3-5">3-5 Business Days (Standard)</SelectItem>
                                    <SelectItem value="5-7">5-7 Business Days (Busy)</SelectItem>
                                    <SelectItem value="7+">7+ Business Days (Backlog)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">Expected time from order placement to shipment/pickup readiness.</p>
                    </label>

                    {/* Final Step Info Box */}
                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 mt-8">
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-primary">
                                <span className="text-xl font-bold">i</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-900 text-sm mb-1">What Happens Next?</h4>
                                <p className="text-emerald-800/80 text-sm leading-relaxed">
                                    Our team will contact you soon for final verification. Once approved, you can immediately add your printers and start receiving orders.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={actions.goBack}
                        disabled={isSubmitting}
                        className="text-slate-500 font-bold text-sm px-6 py-3 rounded-xl hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-2 group"
                    >
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        Back
                    </button>

                    <button
                        type="submit"
                        disabled={!computed.canProceed || isSubmitting}
                        className={`font-bold text-sm px-10 py-4 rounded-xl transition-all shadow-lg flex items-center gap-2 ${computed.canProceed && !isSubmitting
                            ? "bg-primary hover:bg-orange-600 text-white shadow-orange-500/20"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Application
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
