"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Scale, Book, Shield, Gavel, FileText, Send, RefreshCw, AlertCircle } from "lucide-react"
import { generateLegalStrategy } from "@/lib/api"
import { toast } from "sonner"
import { PageTransition } from "@/components/PageTransition"
import { Skeleton } from "@/components/ui/skeleton"

export default function LegalStrategyGenerator() {
    const { data: session } = useSession()
    const [scenario, setScenario] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        ipc_sections: string[],
        strategies: string[],
        arguments: string[],
        precedents: string[]
    } | null>(null)

    const handleGenerate = async () => {
        if (!scenario.trim()) {
            toast.error("Please describe the case scenario first.")
            return
        }

        setLoading(true)
        setResult(null)
        try {
            const token = (session?.user as any)?.accessToken
            if (!token) throw new Error("Authentication failed.")

            const data = await generateLegalStrategy(scenario, token)
            setResult(data)
            toast.success("Legal strategy generated!")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to generate strategy. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <PageTransition className="space-y-8 max-w-6xl mx-auto">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Scale className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Legal Strategy Generator
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            AI-powered analysis for case scenarios and legal planning.
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-5">
                {/* Left: Input Form (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-indigo-50 dark:border-indigo-900/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                Case Scenario
                            </CardTitle>
                            <CardDescription>
                                Describe the facts and details of the legal case.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <Textarea
                                placeholder="Example: A tenant has not paid rent for 4 months and is refusing to vacate the property despite an eviction notice. Provide a strategy for recovery and eviction..."
                                className="min-h-[300px] resize-none border-indigo-100 dark:border-indigo-900/50 focus-visible:ring-indigo-500"
                                value={scenario}
                                onChange={(e) => setScenario(e.target.value)}
                            />
                            <Button
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12 rounded-xl group"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                        Analyzing Scenario...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                                        Generate Strategy
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                            <strong>Note:</strong> This output is AI-generated and intended for educational and research purposes. Always consult with a qualified legal professional for actual cases.
                        </p>
                    </div>
                </div>

                {/* Right: Results (3 Cols) */}
                <div className="lg:col-span-3 space-y-6">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <ResultSkeleton />
                            </motion.div>
                        ) : result ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Results Grid */}
                                <div className="grid gap-6">
                                    <ResultSection
                                        title="Relevant IPC & Legal Acts"
                                        icon={Book}
                                        items={result.ipc_sections}
                                        color="text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                    />
                                    <ResultSection
                                        title="Possible Legal Strategies"
                                        icon={Shield}
                                        items={result.strategies}
                                        color="text-purple-600 bg-purple-50 dark:bg-purple-900/20"
                                    />
                                    <ResultSection
                                        title="Key Arguments"
                                        icon={Gavel}
                                        items={result.arguments}
                                        color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                                    />
                                    <ResultSection
                                        title="Similar Precedents"
                                        icon={FileText}
                                        items={result.precedents}
                                        color="text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-[500px] flex flex-col items-center justify-center text-center p-8 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl"
                            >
                                <div className="h-20 w-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                                    <Sparkles className="h-10 w-10 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Ready for Analysis</h3>
                                <p className="text-slate-500 mt-2 max-w-sm">
                                    Fill in the case scenario on the left to generate a comprehensive legal strategy and analysis.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </PageTransition>
    )
}

function ResultSection({ title, icon: Icon, items, color }: any) {
    return (
        <Card className="border-indigo-100 dark:border-indigo-900/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-4 border-b border-indigo-50 dark:border-indigo-900/20">
                <CardTitle className="text-md font-bold flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${color}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <ul className="space-y-3">
                    {items.map((item: string, idx: number) => (
                        <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 items-start "
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                            {item}
                        </motion.li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}

function ResultSkeleton() {
    return (
        <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-indigo-50 dark:border-indigo-900/20">
                    <CardHeader className="py-4">
                        <Skeleton className="h-6 w-[200px]" />
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[95%]" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
