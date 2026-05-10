"use client"

import { createContext, useContext, useState, useEffect, Suspense } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ServerCrash } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { fetchPublicSettings } from "@/lib/api"

interface MaintenanceContextType {
    showMaintenance: () => void;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function useMaintenance() {
    const context = useContext(MaintenanceContext);
    if (!context) {
        throw new Error("useMaintenance must be used within a MaintenanceProvider");
    }
    return context;
}

function MaintenanceContent({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [maintenanceInfo, setMaintenanceInfo] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('maintenance') === 'true') {
            setIsOpen(true);
        }

        const handleMaintenanceEvent = async () => {
            setIsOpen(true);
            sessionStorage.removeItem("maintenance_acknowledged");
            // We used to sign out all users here, but we will preserve their active session so they can resume after the maintenance is complete.
            // await signOut({ redirect: false });

            if (pathname !== "/" && pathname !== "/login" && pathname !== "/signup") {
                router.push("/?maintenance=true");
            }
        };

        window.addEventListener('conceptlens-maintenance-active', handleMaintenanceEvent);
        return () => window.removeEventListener('conceptlens-maintenance-active', handleMaintenanceEvent);
    }, [pathname, router, searchParams]);

    useEffect(() => {
        let interval: any;

        const checkMaintenanceStatus = async () => {
            if (session?.user && (session.user as any).role === "admin") {
                // Admins are exempt from UI locking
                if (isOpen) setIsOpen(false);
                return;
            }

            try {
                const settings = await fetchPublicSettings();

                // Helper to check if we should show the modal
                const shouldShowModal = () => {
                    return sessionStorage.getItem("maintenance_acknowledged") !== "true";
                };

                if (settings.maintenance_mode) {
                    if (settings.maintenance_type === "instant") {
                        if (!isOpen && shouldShowModal()) {
                            setIsOpen(true);
                            setMaintenanceInfo("The platform is temporarily offline for urgent maintenance.");
                            if (session?.user) await signOut({ redirect: false });
                        }
                    } else if (settings.maintenance_type === "scheduled") {
                        // Check exact time bounds for scheduled maintenance locally too
                        const start = settings.maintenance_start ? new Date(settings.maintenance_start) : null;
                        const end = settings.maintenance_end ? new Date(settings.maintenance_end) : null;
                        const now = new Date();

                        if (start && end && now >= start && now <= end) {
                            if (!isOpen && shouldShowModal()) {
                                setIsOpen(true);
                                setMaintenanceInfo(settings.scheduled_maintenance_info || "The platform is currently offline for scheduled maintenance.");
                                if (session?.user) await signOut({ redirect: false });
                            }
                        } else if (isOpen) {
                            // Time passed, we are free!
                            setIsOpen(false);
                            sessionStorage.removeItem("maintenance_acknowledged");
                        }
                    }
                } else {
                    // Turn it off when the toggle is flipped off natively
                    if (isOpen) setIsOpen(false);
                    sessionStorage.removeItem("maintenance_acknowledged");
                }
            } catch (error) {
                console.error("Failed to check maintenance status");
            }
        };

        // Check initially
        checkMaintenanceStatus();

        // Then poll every 5 seconds for snappier transitions
        interval = setInterval(checkMaintenanceStatus, 5000);
        return () => clearInterval(interval);
    }, [session, isOpen, pathname]);

    const handleClose = () => {
        // Track acknowledgement for the current session
        sessionStorage.setItem("maintenance_acknowledged", "true");
        setIsOpen(false);
        if (searchParams.get('maintenance') === 'true') {
            router.replace(pathname);
        }
    };

    return (
        <MaintenanceContext.Provider value={{ showMaintenance: () => setIsOpen(true) }}>
            {children}

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-lg border-none bg-[#2e0505] text-rose-50 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-0 overflow-hidden z-[9999] backdrop-blur-xl" showCloseButton={false}>
                    <div className="bg-gradient-to-b from-[#450a0a] to-[#2e0505] p-10 space-y-8 border border-rose-900/50 rounded-lg">
                        <div className="mx-auto bg-rose-600/20 p-6 rounded-3xl w-fit border border-rose-500/30">
                            <ServerCrash className="w-16 h-16 text-rose-500 animate-pulse" />
                        </div>

                        <div className="space-y-4 text-center">
                            <DialogTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">
                                Website in <br /> Maintenance Mode
                            </DialogTitle>
                            <DialogDescription className="text-rose-200/90 text-lg leading-relaxed max-w-sm mx-auto">
                                {maintenanceInfo || "ConceptLens is currently undergoing scheduled maintenance by the administrator. Active sessions have been paused. Normal operation will resume once the updates are complete."}
                            </DialogDescription>
                        </div>

                        <div className="pt-4 flex justify-center">
                            <Button
                                variant="destructive"
                                className="bg-[#e11d48] hover:bg-[#be123c] text-white border-none px-12 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-rose-900/40 transition-all hover:scale-105 active:scale-95"
                                onClick={handleClose}
                            >
                                Acknowledge
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </MaintenanceContext.Provider>
    )
}

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<>{children}</>}>
            <MaintenanceContent>
                {children}
            </MaintenanceContent>
        </Suspense>
    )
}
