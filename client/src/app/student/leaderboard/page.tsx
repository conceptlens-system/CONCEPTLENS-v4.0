"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { PageTransition } from "@/components/PageTransition"
import confetti from "canvas-confetti"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Medal, Star, Crown, Users, TrendingUp, TrendingDown, Minus, ChevronRight, Lock, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { fetchClassLeaderboard, fetchClasses } from "@/lib/api"
import { toast } from "sonner"

// Difficult Level-Up Logic based entirely on XP threshold
const getLevelInfo = (xp: number) => {
    const levels = [
        { min: 0, max: 1000, num: 1, name: "Novice", color: "bg-slate-100 text-slate-600 border-slate-200", fill: "bg-slate-400" },
        { min: 1001, max: 2500, num: 2, name: "Apprentice", color: "bg-amber-100 text-amber-700 border-amber-200", fill: "bg-amber-500" },
        { min: 2501, max: 5000, num: 3, name: "Scholar", color: "bg-emerald-100 text-emerald-700 border-emerald-200", fill: "bg-emerald-500" },
        { min: 5001, max: 10000, num: 4, name: "Adept", color: "bg-teal-100 text-teal-700 border-teal-200", fill: "bg-teal-500" },
        { min: 10001, max: 20000, num: 5, name: "Expert", color: "bg-sky-100 text-sky-700 border-sky-200", fill: "bg-sky-500" },
        { min: 20001, max: 35000, num: 6, name: "Master", color: "bg-blue-100 text-blue-700 border-blue-200", fill: "bg-blue-500" },
        { min: 35001, max: 55000, num: 7, name: "Grandmaster", color: "bg-indigo-100 text-indigo-700 border-indigo-200", fill: "bg-indigo-500" },
        { min: 55001, max: 80000, num: 8, name: "Champion", color: "bg-violet-100 text-violet-700 border-violet-200", fill: "bg-violet-500" },
        { min: 80001, max: 120000, num: 9, name: "Legend", color: "bg-rose-100 text-rose-700 border-rose-200", fill: "bg-rose-500" },
        { min: 120001, max: 9999999, num: 10, name: "Mythic", color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200", fill: "bg-fuchsia-500" }
    ]

    const currentLevel = levels.find(l => xp >= l.min && xp <= l.max) || levels[levels.length - 1];
    const currentLevelXP = xp - currentLevel.min;
    const maxLevelXP = currentLevel.max - currentLevel.min;
    // Need to avoid division by zero for max level
    const progressPct = currentLevel.num === 10 ? 100 : Math.min(100, Math.max(0, (currentLevelXP / maxLevelXP) * 100));

    return {
        ...currentLevel,
        progressPct,
        xpNeeded: maxLevelXP - currentLevelXP,
        nextLevelXP: currentLevel.max + 1,
        allLevels: levels // Expose this for the roadmap UI
    }
}

export default function LeaderboardPage() {
    const { data: session, status } = useSession()

    const [classLeaders, setClassLeaders] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClass, setSelectedClass] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [leadersLoading, setLeadersLoading] = useState(false)
    const [roadmapOpen, setRoadmapOpen] = useState(false)

    const currentUserName = session?.user?.name

    // Check and Trigger Top 3 Celebration
    useEffect(() => {
        if (!leadersLoading && classLeaders.length > 0 && currentUserName) {
            const myIndex = classLeaders.findIndex(s => s.full_name === currentUserName)
            if (myIndex !== -1 && myIndex < 3) {
                const myRank = myIndex + 1
                const storageKey = `leaderboard_celebrated_rank_${selectedClass} `
                const previouslyCelebrated = localStorage.getItem(storageKey)

                // Only celebrate if we've never celebrated this rank or better for this class
                if (!previouslyCelebrated || parseInt(previouslyCelebrated) > myRank) {
                    localStorage.setItem(storageKey, myRank.toString())

                    // Fire different confetti based on rank
                    setTimeout(() => {
                        if (myRank === 1) {
                            // Epic Golden Celebration
                            const duration = 3000;
                            const end = Date.now() + duration;
                            (function frame() {
                                confetti({
                                    particleCount: 5,
                                    angle: 60,
                                    spread: 55,
                                    origin: { x: 0 },
                                    colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffd700']
                                });
                                confetti({
                                    particleCount: 5,
                                    angle: 120,
                                    spread: 55,
                                    origin: { x: 1 },
                                    colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffd700']
                                });
                                if (Date.now() < end) {
                                    requestAnimationFrame(frame);
                                }
                            }());
                        } else if (myRank === 2) {
                            // Silver Celebration
                            confetti({
                                particleCount: 150,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#94a3b8', '#cbd5e1', '#f1f5f9', '#ffffff']
                            })
                        } else if (myRank === 3) {
                            // Bronze Celebration
                            confetti({
                                particleCount: 120,
                                spread: 60,
                                origin: { y: 0.6 },
                                colors: ['#b45309', '#d97706', '#f59e0b', '#78350f']
                            })
                        }
                    }, 600) // slight delay for UI to paint
                }
            }
        }
    }, [leadersLoading, classLeaders, currentUserName, selectedClass])


    useEffect(() => {
        if (status === "loading") return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const loadInitialData = async () => {
            try {
                // Fetch Enrolled Classes
                const classesData = await fetchClasses(token).catch(() => [])
                setClasses(classesData)

                if (classesData.length > 0) {
                    setSelectedClass(prev => prev ? prev : classesData[0]._id)
                }
            } catch (e) {
                console.error("Leaderboard load error:", e)
                toast.error("Failed to load classes")
            } finally {
                setLoading(false)
            }
        }

        loadInitialData()
    }, [session?.user?.email, status])

    useEffect(() => {
        if (!selectedClass) return
        const token = (session?.user as any)?.accessToken
        if (!token) return

        const loadClassLeaders = async () => {
            setLeadersLoading(true)
            try {
                const classData = await fetchClassLeaderboard(selectedClass, token)
                setClassLeaders(classData)
            } catch (e) {
                console.error("Class leaderboard error", e)
            } finally {
                setLeadersLoading(false)
            }
        }

        loadClassLeaders()
    }, [selectedClass, session?.user?.email]) // Use email or a primitive rather than the entire session object

    const renderLeaderboard = (data: any[]) => {
        if (loading || leadersLoading) return (
            <div className="space-y-4 pt-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
            </div>
        )

        if (data.length === 0) return (
            <Card className="border-dashed bg-slate-50/50 mt-4">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Trophy className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium text-lg">No champions yet!</p>
                    <p className="text-sm text-slate-400 text-center max-w-sm mt-2">
                        Complete exams to earn XP and climb the class ranks.
                    </p>
                </CardContent>
            </Card>
        )

        return (
            <div className="mt-6 space-y-4">
                {/* Top 3 Podium (Optional, but looks premium) */}
                <div className="flex justify-center items-end gap-2 sm:gap-6 mb-12 mt-8 px-2">
                    {/* 2nd Place */}
                    {data.length > 1 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-100 mb-2">
                            <div className="relative">
                                <div className="absolute -top-3 -right-3 bg-slate-200 text-slate-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs ring-2 ring-white z-10">2</div>
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center text-xl sm:text-2xl font-bold text-slate-400 shadow-md">
                                    {data[1].full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <div className="font-bold text-slate-800 text-sm sm:text-base line-clamp-1 max-w-[80px] sm:max-w-[100px]">{data[1].full_name}</div>
                                <div className="text-indigo-600 font-bold text-xs sm:text-sm">{data[1].points} XP</div>
                            </div>
                            <div className="w-20 sm:w-24 h-16 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-lg mt-3 shadow-inner"></div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {data.length > 0 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 z-10">
                            <div className="relative">
                                <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 w-8 h-8 drop-shadow-md z-10" />
                                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-amber-50 border-4 border-amber-300 flex items-center justify-center text-3xl font-bold text-amber-600 shadow-xl">
                                    {data[0].full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <div className="font-black text-slate-900 text-base sm:text-lg">{data[0].full_name}</div>
                                <div className="text-amber-600 font-bold text-sm sm:text-base flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4 fill-amber-500" /> {data[0].points} XP
                                </div>
                            </div>
                            <div className="w-24 sm:w-32 h-24 bg-gradient-to-t from-amber-300 to-amber-100 rounded-t-xl mt-3 shadow-[inset_0_2px_10px_rgba(251,191,36,0.3)]"></div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {data.length > 2 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-200 mb-4">
                            <div className="relative">
                                <div className="absolute -top-3 -right-3 bg-orange-200 text-orange-700 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs ring-2 ring-white z-10">3</div>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-50 border-4 border-orange-200 flex items-center justify-center text-lg sm:text-xl font-bold text-orange-400 shadow-sm">
                                    {data[2].full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <div className="font-bold text-slate-800 text-sm sm:text-base line-clamp-1 max-w-[80px] sm:max-w-[100px]">{data[2].full_name}</div>
                                <div className="text-indigo-600 font-bold text-xs sm:text-sm">{data[2].points} XP</div>
                            </div>
                            <div className="w-16 sm:w-20 h-12 bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-lg mt-3 shadow-inner"></div>
                        </div>
                    )}
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Leaderboard List */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <div className="flex items-center gap-6 sm:gap-10 w-1/2">
                                <span className="w-8 text-center shrink-0">Rank</span>
                                <span className="shrink-0">Student</span>
                            </div>
                            <div className="flex items-center justify-end gap-6 sm:gap-12 w-1/2">
                                <span className="hidden sm:inline-block w-20 text-center">Tier</span>
                                <span className="w-16 text-center">Trend</span>
                                <span className="w-20 text-right">Score</span>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {data.map((student, idx) => {
                                const isMe = student.full_name === currentUserName;

                                // Deterministic mock trends based on rank and ID string char code
                                const charCode = student._id ? student._id.charCodeAt(student._id.length - 1) : 0;
                                const trend = idx < 3 ? "up" : (charCode % 3 === 0 ? "up" : (charCode % 3 === 1 ? "down" : "same"));

                                // Ranked Tiers logic
                                const getTier = (rank: number) => {
                                    if (rank === 0) return { name: "Elite", color: "bg-indigo-100 text-indigo-700 border-indigo-200" }
                                    if (rank <= 2) return { name: "Diamond", color: "bg-sky-100 text-sky-700 border-sky-200" }
                                    if (rank <= 9) return { name: "Gold", color: "bg-amber-100 text-amber-700 border-amber-200" }
                                    if (rank <= 19) return { name: "Silver", color: "bg-slate-200 text-slate-700 border-slate-300" }
                                    return { name: "Bronze", color: "bg-orange-100 text-orange-800 border-orange-200" }
                                }
                                const tier = getTier(idx);

                                // Difficult Level-Up Logic based entirely on XP threshold
                                const getLevelInfo = (xp: number) => {
                                    const levels = [
                                        { min: 0, max: 1000, num: 1, name: "Novice", color: "bg-slate-100 text-slate-600 border-slate-200", fill: "bg-slate-400" },
                                        { min: 1001, max: 2500, num: 2, name: "Apprentice", color: "bg-amber-100 text-amber-700 border-amber-200", fill: "bg-amber-500" },
                                        { min: 2501, max: 5000, num: 3, name: "Scholar", color: "bg-emerald-100 text-emerald-700 border-emerald-200", fill: "bg-emerald-500" },
                                        { min: 5001, max: 10000, num: 4, name: "Adept", color: "bg-teal-100 text-teal-700 border-teal-200", fill: "bg-teal-500" },
                                        { min: 10001, max: 20000, num: 5, name: "Expert", color: "bg-sky-100 text-sky-700 border-sky-200", fill: "bg-sky-500" },
                                        { min: 20001, max: 35000, num: 6, name: "Master", color: "bg-blue-100 text-blue-700 border-blue-200", fill: "bg-blue-500" },
                                        { min: 35001, max: 55000, num: 7, name: "Grandmaster", color: "bg-indigo-100 text-indigo-700 border-indigo-200", fill: "bg-indigo-500" },
                                        { min: 55001, max: 80000, num: 8, name: "Champion", color: "bg-violet-100 text-violet-700 border-violet-200", fill: "bg-violet-500" },
                                        { min: 80001, max: 120000, num: 9, name: "Legend", color: "bg-rose-100 text-rose-700 border-rose-200", fill: "bg-rose-500" },
                                        { min: 120001, max: 9999999, num: 10, name: "Mythic", color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200", fill: "bg-fuchsia-500" }
                                    ]

                                    const currentLevel = levels.find(l => xp >= l.min && xp <= l.max) || levels[levels.length - 1];
                                    const currentLevelXP = xp - currentLevel.min;
                                    const maxLevelXP = currentLevel.max - currentLevel.min;
                                    // Need to avoid division by zero for max level
                                    const progressPct = currentLevel.num === 10 ? 100 : Math.min(100, Math.max(0, (currentLevelXP / maxLevelXP) * 100));

                                    return {
                                        ...currentLevel,
                                        progressPct,
                                        xpNeeded: maxLevelXP - currentLevelXP,
                                        nextLevelXP: currentLevel.max + 1
                                    }
                                }
                                const levelInfo = getLevelInfo(student.points || 0);

                                return (
                                    <div
                                        key={student._id}
                                        className={`p-4 flex items-center justify-between transition-colors ${isMe ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-6 sm:gap-10 w-1/2">
                                            <div className="w-8 flex justify-center shrink-0">
                                                {idx === 0 ? <Medal className="w-6 h-6 text-amber-500" /> :
                                                    idx === 1 ? <Medal className="w-6 h-6 text-slate-400" /> :
                                                        idx === 2 ? <Medal className="w-6 h-6 text-orange-400" /> :
                                                            <span className="font-bold text-slate-400">#{idx + 1}</span>}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    {student.full_name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                        <span className="line-clamp-1 max-w-[100px] sm:max-w-[160px]">{student.full_name}</span>
                                                        {isMe && <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-1.5 py-0 hidden sm:inline-flex shrink-0">You</Badge>}
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center mt-1 sm:gap-3 w-full max-w-[200px] sm:max-w-[250px]">
                                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border shrink-0 ${levelInfo.color} mb-1 sm:mb-0`}>
                                                            Lvl {levelInfo.num} • {levelInfo.name}
                                                        </Badge>
                                                        <div className="w-full flex items-center gap-2 group relative">
                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex-1 shrink">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ${levelInfo.fill}`}
                                                                    style={{ width: `${levelInfo.progressPct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[9px] font-medium text-slate-400 shrink-0 tabular-nums">
                                                                {levelInfo.num === 10 ? "MAX" : `${Math.floor(levelInfo.progressPct)}%`}
                                                            </span>

                                                            {/* Tooltip on hover */}
                                                            {levelInfo.num !== 10 && (
                                                                <div className="absolute left-0 bottom-full mb-1 sm:mb-2 hidden sm:group-hover:block w-max bg-slate-800 text-xs text-white px-2 py-1 rounded shadow-lg z-50">
                                                                    {levelInfo.xpNeeded} XP to Level {levelInfo.num + 1}
                                                                    {/* Triangle arrow */}
                                                                    <div className="absolute left-1/2 top-full -mt-[1px] -translate-x-1/2 border-[4px] border-transparent border-t-slate-800"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-6 sm:gap-12 w-1/2">
                                            <div className="hidden sm:flex w-20 justify-center">
                                                <Badge variant="outline" className={`border ${tier.color}`}>{tier.name}</Badge>
                                            </div>

                                            <div className="w-16 flex justify-center">
                                                {trend === "up" && <TrendingUp className="w-5 h-5 text-emerald-500" />}
                                                {trend === "down" && <TrendingDown className="w-5 h-5 text-rose-500" />}
                                                {trend === "same" && <Minus className="w-5 h-5 text-slate-300" />}
                                            </div>

                                            <div className="font-bold text-indigo-600 text-base sm:text-lg flex justify-end items-center gap-1.5 sm:bg-indigo-50 sm:px-3 py-1 rounded-full w-20">
                                                {student.points} <span className="text-xs text-indigo-400 hidden sm:inline-block">XP</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    {/* Right: Personal Standing & Roadmap Widget */}
                    {(() => {
                        const me = data.find(s => s.full_name === currentUserName);
                        if (!me) return null;

                        const myRank = data.findIndex(s => s.full_name === currentUserName) + 1;
                        const myLevel = getLevelInfo(me.points || 0);

                        return (
                            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                                <Card className="border-indigo-100 shadow-md overflow-hidden relative bg-gradient-to-b from-white to-indigo-50/50">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <Star className="w-24 h-24 text-indigo-900" />
                                    </div>
                                    <CardHeader className="pb-4 border-b border-indigo-50 bg-white/50">
                                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-950">
                                            <Crown className="w-5 h-5 text-indigo-500" /> Your Standing
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 relative z-10">
                                        <div className="flex justify-between items-end mb-6">
                                            <div>
                                                <div className="text-sm font-medium text-slate-500 mb-1">Current Class Rank</div>
                                                <div className="text-3xl font-black text-slate-900">#{myRank}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-slate-500 mb-1">Total XP</div>
                                                <div className="text-2xl font-bold text-indigo-600">{me.points.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm mb-6">
                                            <div className="flex justify-between items-center mb-3">
                                                <Badge variant="outline" className={`border ${myLevel.color} text - xs py - 1`}>
                                                    Level {myLevel.num} • {myLevel.name}
                                                </Badge>
                                                {myLevel.num < 10 && (
                                                    <span className="text-xs font-semibold text-slate-400">
                                                        {myLevel.progressPct.toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2 relative">
                                                <div
                                                    className={`h - full rounded - full transition - all duration - 1000 relative ${myLevel.fill} `}
                                                    style={{ width: `${myLevel.progressPct}% ` }}
                                                />
                                            </div>
                                            {myLevel.num < 10 ? (
                                                <p className="text-xs text-slate-500 text-center font-medium mt-3">
                                                    <strong className="text-slate-700">{myLevel.xpNeeded.toLocaleString()} XP</strong> to reach Level {myLevel.num + 1}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-fuchsia-600 text-center font-bold mt-3">
                                                    Maximum Level Reached!
                                                </p>
                                            )}
                                        </div>

                                        <Dialog open={roadmapOpen} onOpenChange={setRoadmapOpen}>
                                            <DialogTrigger asChild>
                                                <button className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                    View Level Roadmap <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto sm:rounded-2xl border-none shadow-2xl p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                                                <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-6 z-20">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-extrabold flex items-center gap-2 translate-y-2">
                                                            <Trophy className="w-6 h-6 text-amber-500" /> Progression Roadmap
                                                        </DialogTitle>
                                                        <DialogDescription className="translate-y-2">
                                                            Track your journey to the Mythic rank. Earn XP by taking exams.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                </div>

                                                <div className="p-6 relative">
                                                    {/* Connecting line behind items */}
                                                    <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-100 -z-10"></div>

                                                    <div className="space-y-6">
                                                        {myLevel.allLevels.map((lvl: any, i: number) => {
                                                            const isCompleted = myLevel.num > lvl.num;
                                                            const isCurrent = myLevel.num === lvl.num;
                                                            const isLocked = myLevel.num < lvl.num;

                                                            return (
                                                                <div key={lvl.num} className={`flex gap-4 relative ${isLocked ? 'opacity-60' : ''}`}>
                                                                    <div className="mt-1 shrink-0 relative z-10">
                                                                        {isCompleted ? (
                                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 ring-4 ring-white">
                                                                                <CheckCircle2 className="w-5 h-5" />
                                                                            </div>
                                                                        ) : isCurrent ? (
                                                                            <div className={`w-8 h-8 rounded-full ${lvl.color} bg-white flex items-center justify-center ring-4 ring-indigo-50 shadow-sm border-2`}>
                                                                                <span className="font-bold text-sm">{lvl.num}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 ring-4 ring-white border border-slate-200">
                                                                                <Lock className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className={`flex-1 rounded-xl p-4 border ${isCurrent ? 'border-indigo-200 bg-indigo-50/30 shadow-sm' : 'border-slate-100 bg-white'}`}>
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div>
                                                                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Level {lvl.num}</div>
                                                                                <div className={`font-bold ${isCurrent ? 'text-indigo-900 text-lg' : 'text-slate-700'}`}>{lvl.name}</div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                                    {lvl.num === 10 ? '120,001+ XP' : `${lvl.min.toLocaleString()} XP`}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {isCurrent && lvl.num < 10 && (
                                                                            <div className="mt-4">
                                                                                <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                                                                                    <span>Progress</span>
                                                                                    <span className="text-indigo-600">{myLevel.progressPct.toFixed(1)}%</span>
                                                                                </div>
                                                                                <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full rounded-full transition-all duration-1000 ${lvl.fill}`}
                                                                                        style={{ width: `${myLevel.progressPct}%` }}
                                                                                    />
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-500 mt-2 text-right font-medium">
                                                                                    {myLevel.xpNeeded.toLocaleString()} XP to go
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })()}
                </div>
            </div>
        )
    }

    return (
        <PageTransition className="space-y-8 pb-12 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                            <Trophy className="w-8 h-8" />
                        </div>
                        Leaderboards
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Compare your progress with classmates. Earn XP by completing exams.</p>
                </div>
            </div>

            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2 text-slate-800">
                            <Users className="w-5 h-5 text-indigo-500" /> Class Standings
                        </CardTitle>
                        <CardDescription className="text-base text-slate-500">
                            See how you rank against your classmates.
                        </CardDescription>
                    </div>
                    {classes.length > 0 && (
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="w-[240px] bg-white border-slate-200">
                                <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => (
                                    <SelectItem key={c._id} value={c._id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardHeader>

                {classes.length === 0 && !loading ? (
                    <Card className="border-dashed bg-slate-50/50 mt-4">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Users className="h-12 w-12 mb-4 text-slate-300" />
                            <p className="font-medium text-lg">Not in any classes</p>
                            <p className="text-sm text-slate-400 text-center max-w-sm mt-2">
                                Join a class to see how you stack up against classmates.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    renderLeaderboard(classLeaders)
                )}
            </Card>
        </PageTransition>
    )
}
