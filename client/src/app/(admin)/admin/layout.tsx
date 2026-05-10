"use client"

import { DashboardNavbar } from "@/components/DashboardNavbar"
import { Footer } from "@/components/landing/Footer"

import GlobalAnnouncementBanner from "@/components/GlobalAnnouncementBanner"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50/50">
            <GlobalAnnouncementBanner />
            <DashboardNavbar />
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                {children}
            </main>
            <Footer />
        </div>
    )
}
