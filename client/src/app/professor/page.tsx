"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, Clock, Plus, AlertCircle, BarChart3, Mail, Bell, CheckCircle2, ChevronRight, TrendingUp, Calendar, Zap } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { fetchExams, fetchClasses, fetchMisconceptions, fetchNotifications, fetchAssessmentSummaries } from "@/lib/api"
import { format } from "date-fns"
import { PageTransition } from "@/components/PageTransition"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfessorDashboard() {
    const { data: session, status } = useSession()
    const [stats, setStats] = useState({
        activeClasses: 0,
        upcomingExams: 0,
        nextExam: null as any,
        pendingMisconceptions: 0
    })
    const [notifications, setNotifications] = useState<any[]>([])
    const [performanceData, setPerformanceData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === "loading") return;

        const loadStats = async () => {
            try {
                const token = (session?.user as any)?.accessToken;
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Fetch core data
                const [exams, classes, pending, notifs, assessments] = await Promise.all([
                    fetchExams(token),
                    fetchClasses(token),
                    fetchMisconceptions("pending", token),
                    fetchNotifications(token),
                    fetchAssessmentSummaries(token)
                ])

                const upcoming = exams.filter((e: any) => new Date(e.schedule_start) > new Date())

                // Process chart data (Average score per assessment)
                const chartData = assessments
                    .slice(0, 7)
                    .map((a: any) => ({
                        name: a.title.length > 15 ? a.title.substring(0, 15) + '...' : a.title,
                        score: a.avg_score || 0
                    }))

                setStats({
                    activeClasses: classes.length,
                    upcomingExams: upcoming.length,
                    nextExam: upcoming.sort((a: any, b: any) => new Date(a.schedule_start).getTime() - new Date(b.schedule_start).getTime())[0],
                    pendingMisconceptions: pending.length
                })

                // Filter out notifications older than 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const validNotifications = notifs.filter((n: any) => {
                    const createdAt = new Date(n.created_at);
                    return createdAt >= sevenDaysAgo;
                });

                setNotifications(validNotifications.slice(0, 3))
                setPerformanceData(chartData)

            } catch (e) {
                console.error("Failed to load dashboard stats", e)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [session, status])

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    }

    return (
        <PageTransition className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        Welcome back, {session?.user?.name}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                        Here's what's happening in your classrooms today.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white/50 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {format(new Date(), 'EEEE, MMMM do, yyyy')}
                    </p>
                </div>
            </header>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
                <motion.div variants={item}>
                    {loading ? (
                        <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-[60px]" />
                                <Skeleton className="h-3 w-[140px]" />
                            </div>
                        </div>
                    ) : (
                        <Link href="/professor/classes" className="block h-full">
                            <StatCard
                                title="Active Classes"
                                icon={Users}
                                value={stats.activeClasses}
                                subtext="Currently teaching"
                                color="text-blue-500"
                                gradient="from-blue-500/10 to-blue-500/5"
                            />
                        </Link>
                    )}
                </motion.div>
                <motion.div variants={item}>
                    {loading ? (
                        <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm h-full flex flex-col justify-between">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-[120px]" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-[60px]" />
                                <Skeleton className="h-3 w-[180px]" />
                            </div>
                        </div>
                    ) : (
                        <Link href="/professor/exams" className="block h-full">
                            <Card className="hover:shadow-lg transition-all duration-300 border-white/20 bg-white/60 dark:bg-black/40 backdrop-blur-xl group overflow-hidden relative h-full">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Upcoming Exams</CardTitle>
                                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                        <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    {stats.upcomingExams > 0 ? (
                                        <>
                                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.upcomingExams}</div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                                                <span className="font-semibold text-purple-600 dark:text-purple-400">Next:</span>
                                                {stats.nextExam ? format(new Date(stats.nextExam.schedule_start), 'MMM d, h:mm a') : '-'}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-3xl font-bold text-slate-900 dark:text-white">0</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">No exams scheduled</div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </motion.div>
                <motion.div variants={item}>
                    {loading ? (
                        <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-[140px]" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-[60px]" />
                                <Skeleton className="h-3 w-[160px]" />
                            </div>
                        </div>
                    ) : (
                        <Link href="/professor/misconceptions?status=pending" className="block h-full">
                            <StatCard
                                title="Pending Validations"
                                icon={AlertCircle}
                                value={stats.pendingMisconceptions}
                                subtext="Misconceptions to review"
                                color="text-amber-500"
                                gradient="from-amber-500/10 to-amber-500/5"
                            />
                        </Link>
                    )}
                </motion.div>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3 mt-8">
                {/* Left (1/3): Quick Links */}
                <div className="lg:col-span-1">
                    <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-sm bg-gradient-to-b from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/30 h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-indigo-50 dark:border-indigo-900/30">
                            <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-indigo-500" /> Quick Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex flex-col h-full">
                            <div className="flex flex-col flex-1 divide-y divide-slate-100 dark:divide-white/5">
                                <Link href="/professor/inbox" className="px-5 py-4 flex items-center justify-between hover:bg-white/80 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-amber-100 dark:bg-amber-500/20 p-2.5 rounded-lg group-hover:bg-amber-500 transition-colors relative">
                                            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:text-white" />
                                            {notifications.length > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-white dark:border-slate-900"></span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">Inbox & Notifications</span>
                                            {notifications.length > 0 && (
                                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                    {notifications.length} new message{notifications.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link href="/professor/exams/create" className="px-5 py-4 flex items-center justify-between hover:bg-white/80 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2.5 rounded-lg group-hover:bg-indigo-500 transition-colors">
                                            <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">Create Exam</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link href="/professor/classes" className="px-5 py-4 flex items-center justify-between hover:bg-white/80 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 dark:bg-blue-500/20 p-2.5 rounded-lg group-hover:bg-blue-500 transition-colors">
                                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">Manage Classes</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link href="/professor/misconceptions" className="px-5 py-4 flex items-center justify-between hover:bg-white/80 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-rose-100 dark:bg-rose-500/20 p-2.5 rounded-lg group-hover:bg-rose-500 transition-colors">
                                            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 group-hover:text-white" />
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">Misconceptions</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link href="/professor/curriculum" className="px-5 py-4 flex items-center justify-between hover:bg-white/80 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2.5 rounded-lg group-hover:bg-emerald-500 transition-colors">
                                            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">Curriculum & Syllabus</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right (2/3): Performance Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" /> Performance Trends
                            </h2>
                        </div>
                        <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-sm bg-white dark:bg-slate-900 h-full min-h-[400px]">
                            <CardContent className="p-6 h-full flex flex-col">
                                {loading ? (
                                    <Skeleton className="w-full h-[350px] rounded-lg" />
                                ) : performanceData.length > 0 ? (
                                    <div className="w-full flex-1 min-h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={performanceData}>
                                                <defs>
                                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        borderRadius: '10px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                        padding: '8px 12px'
                                                    }}
                                                    itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="score"
                                                    stroke="#4f46e5"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorScore)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-[350px] w-full flex items-center justify-center text-slate-400 flex-col gap-3">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                                            <BarChart3 className="h-8 w-8 opacity-40" />
                                        </div>
                                        <p className="font-medium">No assessment data available yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </PageTransition>
    )
}

function StatCard({ title, icon: Icon, value, subtext, color, gradient }: any) {
    return (
        <Card className="hover:shadow-lg transition-all duration-300 border-white/20 bg-white/60 dark:bg-black/40 backdrop-blur-xl group overflow-hidden relative h-full">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 opacity-50`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</CardTitle>
                <div className={`p-2 rounded-lg bg-white/50 dark:bg-white/10 backdrop-blur-sm shadow-sm`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtext}</p>
            </CardContent>
        </Card>
    )
}
