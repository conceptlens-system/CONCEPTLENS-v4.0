"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { fetchExam, fetchExamStudentsScores, publishResults, schedulePublishResults } from "@/lib/api"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PageTransition } from "@/components/PageTransition"
import { Loader2, Send, CalendarIcon, Clock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session } = useSession()
    const router = useRouter()
    const [exam, setExam] = useState<any>(null)
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [examId, setExamId] = useState<string>("")
    const [publishDialogOpen, setPublishDialogOpen] = useState(false)

    // Scheduling States
    const [scheduleDate, setScheduleDate] = useState<string>("")
    const [scheduleTime, setScheduleTime] = useState<string>("")
    const [publishTab, setPublishTab] = useState<"now" | "schedule">("now")

    useEffect(() => {
        params.then(p => {
            setExamId(p.id)
            if (session?.user) loadData(p.id)
        })
    }, [params, session])

    const loadData = async (id: string) => {
        const token = (session?.user as any)?.accessToken
        if (!token) return
        try {
            const [examData, studentsData] = await Promise.all([
                fetchExam(id),
                fetchExamStudentsScores(id, token)
            ])
            setExam(examData)
            setResults(studentsData)
        } catch (e) {
            toast.error("Failed to load results")
        } finally {
            setLoading(false)
        }
    }

    const handlePublish = () => {
        setPublishDialogOpen(true)
    }

    const confirmPublish = async () => {
        const token = (session?.user as any)?.accessToken
        setPublishing(true)
        try {
            if (publishTab === "now") {
                await publishResults(examId, token)
                setExam({ ...exam, results_published: true })
                toast.success("Results published successfully!")
            } else {
                if (!scheduleDate || !scheduleTime) {
                    toast.error("Please select both date and time")
                    setPublishing(false)
                    return
                }

                // Combine date and time
                const dateTimeStr = `${scheduleDate}T${scheduleTime}:00`
                const localDateObj = new Date(dateTimeStr)

                // End time validation check
                if (exam.exam_access_end_time && localDateObj < new Date(exam.exam_access_end_time)) {
                    toast.error("Scheduled time must be after the exam ends")
                    setPublishing(false)
                    return
                }

                await schedulePublishResults(examId, localDateObj.toISOString(), token)
                setExam({ ...exam, scheduled_publish_time: localDateObj.toISOString() })
                toast.success("Results scheduled for publishing!")
            }
            setPublishDialogOpen(false)
        } catch (e: any) {
            toast.error(e.message || "Failed to complete action")
        } finally {
            setPublishing(false)
        }
    }

    if (loading) return <div className="p-8">Loading Results...</div>
    if (!exam) return <div className="p-8">Exam not found</div>

    const isExamActive = exam.exam_access_end_time && new Date() < new Date(exam.exam_access_end_time)

    return (
        <PageTransition className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{exam.title} - Results</h1>
                    <p className="text-slate-500 mt-2">Manage grading and result publication.</p>
                </div>
                <div className="space-x-4">
                    <Button variant="outline" onClick={() => router.push("/professor/exams")}>
                        Back to Exams
                    </Button>
                    <div className="inline-block relative group">
                        <Button
                            disabled={exam.results_published || publishing || isExamActive}
                            onClick={handlePublish}
                            className={exam.results_published ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {exam.results_published
                                ? "Results Published"
                                : isExamActive
                                    ? "Cannot Publish Yet"
                                    : "Publish Results"}
                        </Button>
                        {isExamActive && !exam.results_published && (
                            <div className="absolute w-64 top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-center text-white bg-slate-800 rounded opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-10 pointer-events-none shadow-lg">
                                Results cannot be published before the exam's scheduled End Time.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{results.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Average Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {results.length > 0
                                ? (results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(1)
                                : "0"
                            }
                            <span className="text-sm text-slate-400 font-normal ml-1">/ {results[0]?.total_marks || "0"}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {exam.results_published ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Published</Badge>
                        ) : exam.scheduled_publish_time ? (
                            <div className="space-y-1">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Scheduled</Badge>
                                <p className="text-xs text-slate-500">
                                    For {format(new Date(exam.scheduled_publish_time), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                            </div>
                        ) : (
                            <Badge variant="secondary">Draft</Badge>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Student Scores</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        No students have submitted this exam yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.name}</TableCell>
                                        <TableCell>{r.email}</TableCell>
                                        <TableCell>
                                            <span className="font-bold">{r.score}</span>
                                            <span className="text-slate-400 text-xs ml-1">/ {r.total_marks}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Submitted</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>


            <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Results Publishing Options</AlertDialogTitle>
                        <AlertDialogDescription>
                            Choose how you want to release the results for this exam.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <Tabs value={publishTab} onValueChange={(v) => setPublishTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="now">Publish Now</TabsTrigger>
                                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                            </TabsList>

                            <TabsContent value="now" className="space-y-4">
                                <div className="p-4 bg-orange-50 text-orange-800 rounded-md text-sm">
                                    <strong>Warning:</strong> Publishing now is immediate and irreversible. All students will instantly have access to their scores and answer explanations.
                                </div>
                            </TabsContent>

                            <TabsContent value="schedule" className="space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Schedule Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={scheduleDate}
                                                onChange={(e) => setScheduleDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Schedule Time (Local)</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    The exam's designated End Time is {exam.exam_access_end_time ? format(new Date(exam.exam_access_end_time), "MMM d, yyyy h:mm a") : 'Not Set'}. You cannot schedule results prior to this.
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPublish}
                            disabled={publishing}
                            className={publishTab === "now" ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                        >
                            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {publishTab === "now" ? "Publish Immediately" : "Confirm Schedule"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageTransition >
    )
}
