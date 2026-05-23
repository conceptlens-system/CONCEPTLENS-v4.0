"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Key, RotateCw, Zap, AlertCircle } from "lucide-react"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { API_URL } from "@/lib/api"

export function useApiTracker() {
    const { data: session } = useSession()
    const router = useRouter()
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [apiLeft, setApiLeft] = useState<number>(0)
    const [totalLimit, setTotalLimit] = useState<number>(100)
    const [tokensUsed, setTokensUsed] = useState<number>(0)

    const fetchUsage = useCallback(async (isRefresh = false) => {
        const token = (session?.user as any)?.accessToken
        if (!token) return
        
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_URL}/tokens/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    // Session expired handled globally by apiFetch, but this is direct fetch
                }
                throw new Error('Failed to fetch API tokens');
            }
            const data = await res.json();
            
            setApiLeft(data.remaining);
            setTotalLimit(data.daily_limit);
            setTokensUsed(data.tokens_used);

            if (isRefresh) {
                toast.success("API credits refreshed")
            }
        } catch (err: any) {
            setError(err.message || "Failed to load API credits")
            if (isRefresh) {
                toast.error("Error refreshing API credits")
            }
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchUsage()
        }
    }, [fetchUsage, session])

    useEffect(() => {
        const handleUpdate = () => {
            if (session?.user?.accessToken) {
                fetchUsage()
            }
        }
        window.addEventListener('conceptlens-tokens-updated', handleUpdate)
        window.addEventListener('focus', handleUpdate)
        return () => {
            window.removeEventListener('conceptlens-tokens-updated', handleUpdate)
            window.removeEventListener('focus', handleUpdate)
        }
    }, [fetchUsage, session])

    const topUp = useCallback(() => {
        router.push('/contact')
    }, [router])

    return { loading, error, apiLeft, totalLimit, tokensUsed, refresh: () => fetchUsage(true), topUp }
}

export function ApiBalanceTracker() {
    const { loading, error, apiLeft, totalLimit, tokensUsed, refresh, topUp } = useApiTracker()

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50/50">
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                    <AlertCircle className="h-10 w-10 text-red-500 animate-bounce" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-red-900">Sync Failure</p>
                        <p className="text-xs text-red-600">Could not retrieve your API usage records.</p>
                    </div>
                    <Button size="sm" variant="outline" className="border-red-300 hover:bg-red-100 text-red-800" onClick={refresh}>
                        <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Retry Sync
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const usedPercentage = totalLimit > 0 ? Math.round((tokensUsed / totalLimit) * 100) : 0
    const remainingPercentage = 100 - usedPercentage

    // Compute styles dynamically based on balance levels
    let statusColor = "bg-emerald-500"
    let badgeText = "Healthy"
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
    let progressBg = "bg-emerald-500"

    if (usedPercentage >= 90) {
        statusColor = "bg-rose-500"
        badgeText = "Critical"
        badgeVariant = "destructive"
        progressBg = "bg-rose-500 animate-pulse"
    } else if (usedPercentage >= 70) {
        statusColor = "bg-amber-500"
        badgeText = "Low Balance"
        badgeVariant = "secondary"
        progressBg = "bg-amber-500"
    }

    return (
        <Card className="shadow-sm border-slate-200 overflow-hidden relative group">
            {/* Glossy hover flare */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Key className="h-4.5 w-4.5 text-indigo-600" />
                        API Usage & Quota
                    </CardTitle>
                    {loading ? (
                        <Skeleton className="h-6 w-16 rounded-full" />
                    ) : (
                        <Badge 
                            variant={badgeVariant} 
                            className={`
                                font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase transition-all duration-300
                                ${badgeText === "Low Balance" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200" : ""}
                                ${badgeText === "Healthy" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200" : ""}
                            `}
                        >
                            {badgeText}
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-slate-400 text-xs">
                    Used queries out of your daily AI limit.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                {loading ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                            <Skeleton className="h-7 w-28" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 flex-1" />
                            <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                                            {tokensUsed}
                                        </span>
                                        <span className="text-slate-400 font-medium text-sm">
                                            / {totalLimit}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                                        Used Credits
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-slate-700">
                                        {apiLeft} remaining
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">
                                        {remainingPercentage}% left
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar container */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                                <div 
                                    className={`${progressBg} h-full transition-all duration-700 ease-out`}
                                    style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 items-center">
                            <Button 
                                onClick={topUp}
                                disabled={loading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-98"
                            >
                                <Zap className="h-3.5 w-3.5 fill-current" />
                                Top Up Credits
                            </Button>
                            <Button 
                                variant="outline" 
                                size="icon"
                                onClick={refresh}
                                disabled={loading}
                                className="h-9.5 w-9.5 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg active:scale-95 transition-all"
                                title="Sync Usage"
                            >
                                <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
