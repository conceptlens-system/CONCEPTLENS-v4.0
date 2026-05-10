"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Target, Briefcase, Zap, Compass, ChevronRight, Activity, Cpu, DollarSign, BarChart, ArrowRight, BookOpenCheck, ChevronDown } from "lucide-react"
import { fetchStudentCareerMapping } from "@/lib/api"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function CareerMappingPage() {
    const { data: session, status } = useSession()

    const [roles, setRoles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedRole, setExpandedRole] = useState<number | null>(0)
    const router = useRouter()

    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const loadCareerMap = async () => {
            try {
                const res = await fetchStudentCareerMapping(token)
                setRoles(res.data || [])
            } catch (e) {
                console.error("Career Mapping error:", e)
            } finally {
                setLoading(false)
            }
        }

        loadCareerMap()
    }, [session, status])

    return (
        <PageTransition className="space-y-8 pb-12 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                        <div className="bg-sky-100 p-2 rounded-xl text-sky-600">
                            <Compass className="w-8 h-8" />
                        </div>
                        Career & Skill Mapping
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        See how your academic strengths align with real-world industry roles.
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm bg-gradient-to-r from-sky-50 to-indigo-50 overflow-hidden relative">
                        <div className="absolute right-0 top-0 opacity-10 pointer-events-none text-sky-500 translate-x-1/4 -translate-y-1/4">
                            <Cpu className="w-64 h-64" />
                        </div>
                        <CardHeader className="relative z-10 pb-2">
                            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-sky-500 fill-sky-200" /> AI Career Analysis
                            </CardTitle>
                            <CardDescription className="text-slate-600">
                                Powered by Gemini AI. We analyze your performance across all exams and practice quizzes to find your perfect industry match.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="space-y-4">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                            ))
                        ) : roles.length === 0 ? (
                            <Card className="border-dashed bg-slate-50/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <Target className="h-12 w-12 mb-4 text-sky-300" />
                                    <p className="font-medium text-lg">Gathering Data...</p>
                                    <p className="text-sm text-slate-400 text-center max-w-sm mt-2">
                                        We need more exam data to accurately map your skills. Keep taking exams and practice quizzes!
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            roles.map((role, idx) => {
                                const isExpanded = expandedRole === idx;
                                return (
                                    <Card
                                        key={idx}
                                        className={`overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer ${isExpanded ? 'ring-2 ring-sky-500/20' : ''}`}
                                        onClick={() => setExpandedRole(isExpanded ? null : idx)}
                                    >
                                        <div className="flex flex-col md:flex-row">
                                            {/* Left Match Score */}
                                            <div className="bg-slate-50 p-6 md:w-48 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100">
                                                <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle className="text-slate-200" strokeWidth="6" stroke="currentColor" fill="transparent" r="42" cx="48" cy="48" />
                                                        <circle
                                                            className={`transition-all duration-1000 ease-out ${role.match_percentage >= 85 ? 'text-emerald-500' :
                                                                role.match_percentage >= 70 ? 'text-sky-500' : 'text-amber-500'
                                                                }`}
                                                            strokeWidth="6"
                                                            strokeDasharray={264}
                                                            strokeDashoffset={264 - (264 * role.match_percentage) / 100}
                                                            strokeLinecap="round"
                                                            stroke="currentColor"
                                                            fill="transparent"
                                                            r="42" cx="48" cy="48"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-2xl font-black text-slate-800">{role.match_percentage}%</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs uppercase tracking-wider font-bold text-slate-400">Match Score</div>
                                            </div>

                                            {/* Right Content */}
                                            <div className="p-6 flex-1 bg-white flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        <div>
                                                            <h3 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-2">
                                                                {role.role}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                {role.salary_range && (
                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                                                        <DollarSign className="w-3 h-3" /> {role.salary_range}
                                                                    </Badge>
                                                                )}
                                                                {role.difficulty_to_transition && (
                                                                    <Badge variant="outline" className={`flex items-center gap-1 ${role.difficulty_to_transition.toLowerCase() === 'low' ? 'bg-green-50 text-green-700 border-green-200' : role.difficulty_to_transition.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                        <BarChart className="w-3 h-3" /> {role.difficulty_to_transition} Difficulty
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="bg-sky-50 p-2 rounded-lg text-sky-600 shrink-0 self-start">
                                                            <Briefcase className="w-5 h-5" />
                                                        </div>
                                                    </div>

                                                    <p className="text-slate-600 mb-4 leading-relaxed text-sm md:text-base">
                                                        {role.reason}
                                                    </p>
                                                </div>

                                                {/* Expandable Section */}
                                                <div className={cn("grid transition-all duration-300 ease-in-out", isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                                                    <div className="overflow-hidden">
                                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                                            {role.key_skills && role.key_skills.length > 0 && (
                                                                <div className="mb-6">
                                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Skills Required</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {role.key_skills.map((skill: string, sIdx: number) => (
                                                                            <span key={sIdx} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-md border border-slate-200 flex items-center gap-1.5">
                                                                                <BookOpenCheck className="w-3.5 h-3.5 text-slate-400" /> {skill}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 uppercase tracking-wider mb-1">
                                                                        <Activity className="w-4 h-4" /> Next Milestone
                                                                    </div>
                                                                    <div className="text-slate-700 font-medium text-sm">
                                                                        {role.next_skill}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push("/student/practice");
                                                                    }}
                                                                    className="shrink-0 w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                                >
                                                                    Start Training <ArrowRight className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Toggle Indicator */}
                                                <div className="flex justify-center mt-3 pt-3 border-t border-slate-50/50">
                                                    <div className="text-slate-400 flex items-center gap-1 text-xs font-medium uppercase hover:text-sky-600 transition-colors">
                                                        {isExpanded ? 'Show Less' : 'View Details'} <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="bg-slate-900 border-none text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Target className="w-32 h-32 text-sky-400" />
                        </div>
                        <CardHeader className="relative z-10 pb-2">
                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                How it works
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 text-slate-300 space-y-4 text-sm leading-relaxed">
                            <p>
                                As you complete assessments, our system tracks your mastery across different micro-concepts (e.g., SQL Joins, Binary Trees).
                            </p>
                            <p>
                                We then map these proven skills against open job descriptions and industry standards to calculate your match percentage for various roles.
                            </p>
                            <div className="pt-4 border-t border-slate-800">
                                <span className="text-sky-400 font-medium flex items-center gap-1">
                                    <ChevronRight className="w-4 h-4" /> Want better matches?
                                </span>
                                <span className="block mt-1">Keep improving your weakest areas in the Challenge Area.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    )
}
