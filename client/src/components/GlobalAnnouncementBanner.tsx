"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { fetchPublicSettings, fetchGlobalAnnouncements } from "@/lib/api"
import { Info, X, AlertTriangle, AlertOctagon } from "lucide-react"

export default function GlobalAnnouncementBanner() {
    const { data: session } = useSession()

    const [banners, setBanners] = useState<{ id: string, message: string, type: 'info' | 'warning' | 'critical', dismissed: boolean }[]>([])

    useEffect(() => {
        async function loadData() {
            try {
                let newBanners: any[] = [];

                // 1. Load System Notification and Maintenance Info (from Global Settings)
                const settings = await fetchPublicSettings()
                if (settings.system_notification) {
                    const id = `sys_${settings.system_notification}`
                    const isDismissed = localStorage.getItem(`dismissed_banner_${id}`) === "true"
                    if (!isDismissed) {
                        newBanners.push({
                            id,
                            message: settings.system_notification,
                            type: 'info',
                            dismissed: false
                        })
                    }
                }
                if (settings.scheduled_maintenance_info) {
                    const id = `maint_${settings.scheduled_maintenance_info}`
                    const isDismissed = localStorage.getItem(`dismissed_banner_${id}`) === "true"
                    if (!isDismissed) {
                        newBanners.push({
                            id,
                            message: settings.scheduled_maintenance_info,
                            type: 'warning',
                            dismissed: false
                        })
                    }
                }

                // 2. Load Database Announcements
                let dbAnnouncements = []
                const token = (session?.user as any)?.accessToken;
                try {
                    dbAnnouncements = await fetchGlobalAnnouncements(token, true)
                } catch (e) {
                    console.error("Failed to fetch database announcements", e)
                }

                if (Array.isArray(dbAnnouncements)) {
                    dbAnnouncements.forEach((a: any) => {
                        const id = `db_${a._id}`
                        const isDismissed = localStorage.getItem(`dismissed_banner_${id}`) === "true"
                        if (!isDismissed) {
                            newBanners.push({
                                id,
                                message: a.title + (a.message ? `: ${a.message}` : ''),
                                type: a.type || 'info',
                                dismissed: false
                            })
                        }
                    })
                }

                setBanners(newBanners)
            } catch (error) {
                console.error("Failed to load banners", error)
            }
        }

        loadData()
    }, [session])

    const handleDismiss = (id: string) => {
        setBanners(prev => prev.map(b => b.id === id ? { ...b, dismissed: true } : b))
        localStorage.setItem(`dismissed_banner_${id}`, "true")
    }

    const activeBanners = banners.filter(b => !b.dismissed)

    if (activeBanners.length === 0) return null;

    return (
        <div className="w-full flex flex-col z-50 sticky top-0">
            {activeBanners.map((banner) => {
                let Icon = Info
                let bgColor = "bg-blue-600"
                let textColor = "text-white"

                if (banner.type === "warning") {
                    Icon = AlertTriangle
                    bgColor = "bg-amber-500"
                } else if (banner.type === "critical") {
                    Icon = AlertOctagon
                    bgColor = "bg-red-600"
                }

                return (
                    <div key={banner.id} className={`${bgColor} ${textColor} px-4 py-3 flex items-center justify-center relative shadow-md animate-in slide-in-from-top-2 duration-300`}>
                        <div className="flex items-center gap-2 max-w-7xl mx-auto px-8 w-full justify-center text-sm md:text-base font-medium">
                            <Icon className="h-5 w-5 shrink-0 hidden sm:block opacity-90" />
                            <p className="text-center">{banner.message}</p>
                        </div>
                        <button
                            onClick={() => handleDismiss(banner.id)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                        >
                            <X className="h-5 w-5 opacity-90 hover:opacity-100" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
