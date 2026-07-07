"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ProfileTab } from "@/components/dashboard/settings/ProfileTab"
import { SecurityTab } from "@/components/dashboard/settings/SecurityTab"
import { NotificationsTab } from "@/components/dashboard/settings/NotificationsTab"
import { BillingTab } from "@/components/dashboard/settings/BillingTab"
import { getCustomerProfile, getCustomerNotificationSettings, getCustomerSecuritySettings, getCustomerBillingData } from "@/actions/customer-settings"

const tabs = [
    { key: "profile", label: "Profil" },
    { key: "security", label: "Keamanan" },
    { key: "notifications", label: "Notifikasi" },
    { key: "billing", label: "Pembayaran" },
]

interface UserProfile {
    id: string
    name: string
    email: string
    phone: string | null
    avatarUrl: string | null
    addresses: {
        id: string
        label: string
        recipientName: string
        phone: string
        street: string
        city: string
        province: string
        postalCode: string
        isDefault: boolean
        latitude: number | null
        longitude: number | null
    }[]
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile")
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [notificationSettings, setNotificationSettings] = useState<any | null>(null)
    const [securitySettings, setSecuritySettings] = useState<{ twoFactorEnabled: boolean; sessionExpires: string | null } | null>(null)
    const [billingData, setBillingData] = useState<{ transactions: any[]; totalSpent: number } | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async () => {
        setLoading(true)
        const [profileResult, notifResult, securityResult, billingResult] = await Promise.all([
            getCustomerProfile(),
            getCustomerNotificationSettings(),
            getCustomerSecuritySettings(),
            getCustomerBillingData(),
        ])
        if (profileResult.success && profileResult.data) {
            setProfile(profileResult.data as UserProfile)
        }
        if (notifResult.success && notifResult.data) {
            setNotificationSettings(notifResult.data)
        }
        if (securityResult.success && securityResult.data) {
            setSecuritySettings(securityResult.data)
        }
        if (billingResult.success && billingResult.data) {
            setBillingData(billingResult.data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Memuat pengaturan...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="pb-0 bg-transparent z-10">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan</h2>
                <p className="text-sm text-slate-500 mt-1">Kelola profil, keamanan, dan preferensi akun Anda.</p>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 mt-6 border-b border-slate-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                                activeTab === tab.key
                                    ? "text-primary border-primary font-semibold"
                                    : "text-slate-400 hover:text-slate-700 border-transparent"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto py-8 custom-scrollbar pb-8">
                <div className="max-w-4xl">
                    {activeTab === "profile" && profile && (
                        <ProfileTab
                            user={profile}
                            addresses={profile.addresses}
                            onRefresh={fetchProfile}
                        />
                    )}
                    {activeTab === "security" && securitySettings && (
                        <SecurityTab
                            twoFactorEnabled={securitySettings.twoFactorEnabled}
                            sessionExpires={securitySettings.sessionExpires}
                        />
                    )}
                    {activeTab === "notifications" && notificationSettings && (
                        <NotificationsTab
                            initialEmailEnabled={notificationSettings.emailEnabled}
                            initialSettings={{
                                emailEnabled: notificationSettings.emailEnabled,
                                orderConfirmed: notificationSettings.orderConfirmed,
                                printStarted: notificationSettings.printStarted,
                                printCompleted: notificationSettings.printCompleted,
                                shippingUpdate: notificationSettings.shippingUpdate,
                                paymentSuccess: notificationSettings.paymentSuccess,
                                paymentReminder: notificationSettings.paymentReminder,
                                refund: notificationSettings.refund,
                                promo: notificationSettings.promo,
                                newsletter: notificationSettings.newsletter,
                                productUpdate: notificationSettings.productUpdate,
                            }}
                        />
                    )}
                    {activeTab === "billing" && billingData && (
                        <BillingTab
                            transactions={billingData.transactions}
                            totalSpent={billingData.totalSpent}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
