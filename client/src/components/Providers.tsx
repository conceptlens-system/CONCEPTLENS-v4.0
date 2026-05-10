"use client"

import { SessionProvider } from "next-auth/react"
import { MaintenanceProvider } from "./MaintenanceProvider"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <MaintenanceProvider>
                {children}
            </MaintenanceProvider>
        </SessionProvider>
    )
}
