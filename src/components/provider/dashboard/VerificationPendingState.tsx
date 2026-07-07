"use client"

export function VerificationPendingState() {
    return (
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-start lg:justify-center">
            <div className="max-w-4xl w-full space-y-12 py-8">
                {/* Pending Status Card */}
                <div className="bg-white border-2 border-primary rounded-2xl p-8 text-center shadow-xl shadow-primary/5">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
                        <span className="material-symbols-outlined text-4xl">schedule</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Application Under Review</h2>
                    <p className="text-slate-600 text-lg max-w-xl mx-auto leading-relaxed">
                        Your application to become a provider is being reviewed by our team. This usually takes 2-3 business days.
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="relative px-4">
                    <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200"></div>
                    <div className="relative flex justify-between">
                        <div className="flex flex-col items-center text-center space-y-3 z-10">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center ring-4 ring-white">
                                <span className="material-symbols-outlined text-xl filled">check_circle</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">Application Submitted</span>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-3 z-10">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center ring-4 ring-white animate-pulse-soft">
                                <span className="material-symbols-outlined text-xl">verified_user</span>
                            </div>
                            <span className="text-sm font-bold text-primary">Verifying Details</span>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-3 z-10">
                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center ring-4 ring-white">
                                <span className="material-symbols-outlined text-xl">rocket_launch</span>
                            </div>
                            <span className="text-sm font-bold text-slate-400">Ready for Orders</span>
                        </div>
                    </div>
                </div>

                {/* Resource Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 p-6 rounded-xl hover:border-primary/30 transition-colors group">
                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">menu_book</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">Read Provider Guidelines</h3>
                        <p className="text-sm text-slate-500 mb-4">Learn about our quality standards and service level agreements.</p>
                        <a href="#" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                            View Docs <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 rounded-xl hover:border-primary/30 transition-colors group">
                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">forum</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">Join Discord Community</h3>
                        <p className="text-sm text-slate-500 mb-4">Connect with other partners and get real-time support from the community.</p>
                        <a href="#" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                            Join Server <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 rounded-xl hover:border-primary/30 transition-colors group">
                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">build</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">Prepare Your Equipment</h3>
                        <p className="text-sm text-slate-500 mb-4">Tips on calibrating your fleet for high-tolerance industrial prints.</p>
                        <a href="#" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                            Read Guide <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                </div>

                {/* Contact Support */}
                <div className="flex flex-col items-center pt-4">
                    <p className="text-slate-500 text-sm mb-4">Need help or have questions about your application?</p>
                    <button className="px-6 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">contact_support</span>
                        Contact Partner Support
                    </button>
                </div>
            </div>
        </div>
    )
}
