"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Calendar, Clock, BookOpen, AlertCircle, Trash2, Filter, X, FileText, Search, Pencil, Send, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { fetchExams, fetchSubjects, deleteExam, validateExam, scheduleExamPublish } from "@/lib/api"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ConfirmModal"
import { PageTransition } from "@/components/PageTransition"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

export default function ExamsPage() {
    const { data: session, status } = useSession()
    const [exams, setExams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [subjects, setSubjects] = useState<Record<string, string>>({})
    const [drafts, setDrafts] = useState<any[]>([])
    const [isDraftsOpen, setIsDraftsOpen] = useState(false)
    const router = useRouter()

    // Filters
    const [subjectFilter, setSubjectFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })
    const [confirmTitle, setConfirmTitle] = useState("")

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 9

    // Publish Dialog State
    const [publishDialogOpen, setPublishDialogOpen] = useState(false)
    const [selectedExamId, setSelectedExamId] = useState<string>("")
    const [publishing, setPublishing] = useState(false)
    const [publishTab, setPublishTab] = useState<"now" | "schedule">("now")
    const [scheduleDate, setScheduleDate] = useState<string>("")
    const [scheduleTime, setScheduleTime] = useState<string>("")

    useEffect(() => {
        // Load and Migrate Drafts
        const savedDraft = localStorage.getItem("createExamDraft")
        const savedDrafts = localStorage.getItem("examDrafts")

        let currentDrafts: any[] = []

        if (savedDrafts) {
            try {
                currentDrafts = JSON.parse(savedDrafts)
            } catch (e) {
                console.error("Invalid drafts array", e)
            }
        }

        // Migration: If old single draft exists, move to array
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft)
                if (parsed.title || parsed.questions?.length > 0) {
                    const newDraft = {
                        ...parsed,
                        id: crypto.randomUUID(),
                        lastModified: Date.now()
                    }
                    currentDrafts.unshift(newDraft)
                    localStorage.setItem("examDrafts", JSON.stringify(currentDrafts))
                    localStorage.removeItem("createExamDraft")
                    toast.info("Migrated existing draft to new system")
                }
            } catch (e) {
                console.error("Invalid old draft", e)
            }
        }

        setDrafts(currentDrafts)

        if (status === "loading") return
        const token = (session?.user as any)?.accessToken

        if (status === "unauthenticated" || !token) {
            setLoading(false)
            return
        }

        const load = async () => {
            try {
                const [examsData, subjectsData] = await Promise.all([
                    fetchExams(token),
                    fetchSubjects(token)
                ])
                setExams(examsData)

                // Create subject map
                const sMap: Record<string, string> = {}
                subjectsData.forEach((s: any) => {
                    sMap[s._id] = s.name
                })
                setSubjects(sMap)
            } catch (e) {
                console.error(e)
                toast.error("Failed to load data")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [session, status])

    const filteredExams = exams.filter(e => {
        const matchesSubject = subjectFilter === "all" || e.subject_id === subjectFilter
        const matchesSearch = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSubject && matchesSearch
    })

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [subjectFilter, searchQuery])

    const totalPages = Math.ceil(filteredExams.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentExams = filteredExams.slice(startIndex, startIndex + itemsPerPage)

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    // Unified loading state
    // Unified loading state
    const isLoadingState = loading

    const handleDiscardDraft = (id: string) => {
        setConfirmTitle("Delete Draft?")
        setConfirmAction(() => async () => {
            const newDrafts = drafts.filter(d => d.id !== id)
            setDrafts(newDrafts)
            localStorage.setItem("examDrafts", JSON.stringify(newDrafts))
            toast.info("Draft discarded")
        })
        setConfirmOpen(true)
    }

    const handleCreateExamClick = (e: React.MouseEvent) => {
        if (drafts.length >= 5) {
            e.preventDefault()
            setIsDraftsOpen(true)
            toast.warning("Draft limit reached (5/5). Please complete or discard a draft.")
        }
    }

    const handleDeleteExam = async (id: string, title: string) => {
        setConfirmTitle(`Delete Exam: ${title}?`)
        setConfirmAction(() => async () => {
            const token = (session?.user as any)?.accessToken
            if (!token) return

            try {
                await deleteExam(id, token)
                setExams(exams.filter(e => e._id !== id))
                toast.success("Exam deleted")
            } catch (e) {
                toast.error("Failed to delete exam")
            }
        })
        setConfirmOpen(true)
    }

    const handleToggleValidation = async (id: string, newVal: boolean) => {
        const token = (session?.user as any)?.accessToken
        if (!token) return
        try {
            await validateExam(id, newVal, token)
            setExams(exams.map(e => e._id === id ? { ...e, is_validated: newVal, scheduled_exam_publish_time: null } : e))
            toast.success(newVal ? "Exam Published" : "Exam Unpublished")
        } catch (e) {
            toast.error("Failed to update status")
        }
    }

    const openPublishDialog = (id: string, currentStatus: boolean, scheduledTime: any) => {
        if (currentStatus) {
            // Already validated, so unpublish immediately
            handleToggleValidation(id, false)
        } else {
            // Open Dialog
            setSelectedExamId(id)
            if (scheduledTime) {
                setPublishTab("schedule")
                const dt = new Date(scheduledTime)
                setScheduleDate(format(dt, "yyyy-MM-dd"))
                setScheduleTime(format(dt, "HH:mm"))
            } else {
                setPublishTab("now")
                setScheduleDate("")
                setScheduleTime("")
            }
            setPublishDialogOpen(true)
        }
    }

    const confirmPublish = async () => {
        const token = (session?.user as any)?.accessToken
        setPublishing(true)
        try {
            if (publishTab === "now") {
                await validateExam(selectedExamId, true, token)
                setExams(exams.map(e => e._id === selectedExamId ? { ...e, is_validated: true, scheduled_exam_publish_time: null } : e))
                toast.success("Exam Published successfully!")
            } else {
                if (!scheduleDate || !scheduleTime) {
                    toast.error("Please select both date and time")
                    setPublishing(false)
                    return
                }
                const dateTimeStr = `${scheduleDate}T${scheduleTime}:00`
                const localDateObj = new Date(dateTimeStr)
                await scheduleExamPublish(selectedExamId, localDateObj.toISOString(), token)
                setExams(exams.map(e => e._id === selectedExamId ? { ...e, is_validated: false, scheduled_exam_publish_time: localDateObj.toISOString() } : e))
                toast.success("Exam scheduled for publishing!")
            }
            setPublishDialogOpen(false)
        } catch (e: any) {
            toast.error(e.message || "Failed to publish exam")
        } finally {
            setPublishing(false)
        }
    }



    return (
        <PageTransition className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
                    <p className="text-slate-500">Manage assessments and quizzes.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    {/* Filters */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
                        <Filter className="h-4 w-4 text-slate-400 ml-2" />
                        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                            <SelectTrigger className="w-[140px] border-0 focus:ring-0 h-9">
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                {Object.entries(subjects).map(([id, name]) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="h-4 w-[1px] bg-slate-200" />
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search exams..."
                                className="pl-8 h-9 w-[180px] rounded-md border-0 focus:ring-0 text-sm bg-transparent placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-2 top-2.5">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                        {(subjectFilter !== "all" || searchQuery) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 mr-1 rounded-full hover:bg-slate-100"
                                onClick={() => { setSubjectFilter("all"); setSearchQuery("") }}
                            >
                                <X className="h-3 w-3 text-slate-500" />
                            </Button>
                        )}
                    </div>

                    {drafts.length > 0 && (
                        <Button variant="outline" onClick={() => setIsDraftsOpen(true)}>
                            <FileText className="mr-2 h-4 w-4" /> Drafts ({drafts.length})
                        </Button>
                    )}

                    <Button asChild onClick={handleCreateExamClick} className={drafts.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}>
                        <Link href="/professor/exams/create" onClick={handleCreateExamClick}>
                            <Plus className="mr-2 h-4 w-4" /> Create Exam
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Drafts Modal */}
            <Dialog open={isDraftsOpen} onOpenChange={setIsDraftsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Saved Drafts ({drafts.length}/5)</DialogTitle>
                        <DialogDescription>
                            You can have up to 5 unfinished exams.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        {drafts.length === 0 ? (
                            <div className="text-center text-slate-500 py-8">No saved drafts.</div>
                        ) : (
                            drafts.map((d) => (
                                <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                    <div className="space-y-1">
                                        <div className="font-medium">{d.title || "Untitled Exam"}</div>
                                        <div className="text-xs text-slate-500">
                                            {d.questions?.length || 0} questions • {format(new Date(d.lastModified || Date.now()), 'MMM d, h:mm a')}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" asChild onClick={() => setIsDraftsOpen(false)}>
                                            <Link href={`/professor/exams/create?draftId=${d.id}`}>Edit</Link>
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleDiscardDraft(d.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                        {drafts.length >= 5 && (
                            <div className="text-sm text-red-500 bg-red-50 p-3 rounded flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Draft limit reached. Discard to create new.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {isLoadingState ? (
                        Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="h-[200px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))
                    ) : (
                        currentExams.map((exam, i) => (
                            <motion.div
                                key={exam._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                            >
                                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col gap-1.5">
                                                <Badge variant={exam.is_validated ? "default" : exam.scheduled_exam_publish_time ? "secondary" : "outline"} className={`w-fit ${exam.scheduled_exam_publish_time && !exam.is_validated ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-transparent' : ''}`}>
                                                    {exam.is_validated ? "Exam Published" : exam.scheduled_exam_publish_time ? "Scheduled" : "Draft"}
                                                </Badge>
                                                {exam.is_validated && (
                                                    <Badge variant="outline" className={`w-fit text-[10px] px-1.5 py-0 ${exam.results_published ? "border-green-300 bg-green-50 text-green-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>
                                                        {exam.results_published ? "Results Published" : "Results Pending"}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {exam.questions?.length === 0 && <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />}
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-900" asChild>
                                                    <Link href={`/professor/exams/${exam._id}`}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg font-bold">
                                            <span className="truncate block" title={exam.title}>{exam.title}</span>
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-1">
                                            <BookOpen className="h-3 w-3" />
                                            {subjects[exam.subject_id] || "Unknown Subject"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col justify-end">
                                        <div className="space-y-2 text-sm text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                <span>{exam.duration_minutes} mins</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>{exam.schedule_start ? format(new Date(exam.schedule_start), 'PPP p') : 'Unscheduled'}</span>
                                            </div>
                                            <div className="pt-4 flex flex-col gap-2">
                                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                                    <div className="text-xs font-medium">
                                                        {exam.questions?.length || 0} Questions
                                                    </div>
                                                    <div className={`text-xs font-medium ${exam.anti_cheat_config?.fullscreen ? 'text-green-600' : 'text-slate-500'}`}>
                                                        Anti-Cheat: {exam.anti_cheat_config?.fullscreen ? 'On' : 'Off'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        variant={exam.is_validated || exam.scheduled_exam_publish_time ? "secondary" : "default"}
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => openPublishDialog(exam._id, exam.is_validated, exam.scheduled_exam_publish_time)}
                                                    >
                                                        {exam.is_validated || exam.scheduled_exam_publish_time ? "Unpublish" : "Publish"}
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/professor/exams/${exam._id}/results`}>Results</Link>
                                                    </Button>

                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteExam(exam._id, exam.title)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}

                    {!loading && filteredExams.length === 0 && (
                        <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg text-slate-400">
                            No exams created yet. Click "Create Exam" to begin.
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-slate-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmTitle}
                description="This action cannot be undone."
                onConfirm={confirmAction}
                variant="destructive"
            />

            <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Publish Exam</AlertDialogTitle>
                        <AlertDialogDescription>
                            Choose how you want to release this exam to students.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <Tabs value={publishTab} onValueChange={(v) => setPublishTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="now">Publish Now</TabsTrigger>
                                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                            </TabsList>

                            <TabsContent value="now" className="space-y-4">
                                <div className="p-4 bg-orange-50 text-orange-800 rounded-md text-sm leading-relaxed">
                                    <strong>Immediate Release:</strong> Students will immediately see this exam in their dashboard and can begin attempts if the current time matches your configured schedule.
                                </div>
                            </TabsContent>

                            <TabsContent value="schedule" className="space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Schedule Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full border-slate-200 rounded-lg text-sm pl-10 h-10 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                                                value={scheduleDate}
                                                onChange={(e) => setScheduleDate(e.target.value)}
                                            />
                                            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Schedule Time</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                className="w-full border-slate-200 rounded-lg text-sm pl-10 h-10 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                            />
                                            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        The exam will automatically switch to "Published" status exactly on this date and time in your local timezone.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
                        <Button
                            onClick={confirmPublish}
                            disabled={publishing || (publishTab === "schedule" && (!scheduleDate || !scheduleTime))}
                        >
                            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Confirm
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageTransition >
    )
}
