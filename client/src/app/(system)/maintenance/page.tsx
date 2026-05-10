"use client"

import { ServerCrash, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-8 text-center space-y-6">

                <div className="mx-auto bg-amber-100 text-amber-600 p-4 rounded-full w-fit mb-6">
                    <ServerCrash className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Platform Offline
                    </h1>
                    <p className="text-slate-500">
                        ConceptLens is currently undergoing scheduled maintenance. Our engineers are applying updates to improve your experience. We will be back online shortly.
                    </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <Button
                        onClick={() => window.location.href = '/login'}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    <p className="text-xs text-slate-400">
                        Expected downtime is usually less than 15 minutes.
                    </p>
                </div>
            </div>
        </div>
    )
}
