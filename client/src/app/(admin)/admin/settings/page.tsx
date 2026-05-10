"use client"

import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchGlobalSettings, updateGlobalSettings, fetchGlobalAnnouncements, createGlobalAnnouncement, toggleGlobalAnnouncement, deleteGlobalAnnouncement } from "@/lib/api"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Settings, Save, Loader2, AlertTriangle, Shield, HardDrive, Bell, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

export default function AdminSettingsPage() {
    const { data: session } = useSession()
    const [settings, setSettings] = useState({
        ai_features_enabled: true,
        maintenance_mode: false,
        maintenance_type: "instant",
        maintenance_start: "",
        maintenance_end: "",
        max_upload_size_mb: 10,
        system_notification: ""
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        async function loadSettings() {
            if (!session?.user) return
            try {
                // @ts-ignore
                const data = await fetchGlobalSettings((session.user as any).accessToken)
                let maintenanceStart = ""
                let maintenanceEnd = ""
                if (data.maintenance_start) {
                    const d = new Date(data.maintenance_start)
                    maintenanceStart = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                }
                if (data.maintenance_end) {
                    const d = new Date(data.maintenance_end)
                    maintenanceEnd = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                }

                setSettings({
                    ai_features_enabled: data.ai_features_enabled ?? true,
                    maintenance_mode: data.maintenance_mode ?? false,
                    maintenance_type: data.maintenance_type || "instant",
                    maintenance_start: maintenanceStart,
                    maintenance_end: maintenanceEnd,
                    max_upload_size_mb: data.max_upload_size_mb ?? 10,
                    system_notification: data.system_notification ?? ""
                })
            } catch (err: any) {
                console.error(err)
                setError("Failed to load global configurations")
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [session])

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload: any = { ...settings }
            if (payload.maintenance_start) payload.maintenance_start = new Date(payload.maintenance_start).toISOString()
            else payload.maintenance_start = null

            if (payload.maintenance_end) payload.maintenance_end = new Date(payload.maintenance_end).toISOString()
            else payload.maintenance_end = null

            if (!session?.user) throw new Error("Unauthorized")

            await updateGlobalSettings((session.user as any).accessToken, payload)
            toast.success("Platform settings updated successfully")
        } catch (err: any) {
            console.error(err)
            toast.error("Failed to save settings")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <PageTransition>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <Settings className="h-8 w-8 text-indigo-600" />
                            Global Configurations
                        </h1>
                        <p className="mt-2 text-slate-500">Manage platform-wide settings and maintenance controls.</p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 animate-pulse">
                        Loading preferences...
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                ) : (
                    <div className="space-y-6 mt-8">

                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Shield className="h-5 w-5 text-indigo-500" />
                                    Platform Features
                                </CardTitle>
                                <CardDescription>Enable or disable core system capabilities globally.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-row items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Enable Gemini AI Features</Label>
                                        <p className="text-sm text-slate-500">
                                            Allow professors to auto-generate AI exams and summaries. Disable if API quota is reached.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.ai_features_enabled}
                                        onCheckedChange={(c) => setSettings({ ...settings, ai_features_enabled: c })}
                                    />
                                </div>

                                <div className="flex flex-col gap-4 rounded-lg border border-red-100 bg-red-50/30 p-4">
                                    <div className="flex flex-row items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base text-red-900 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                                Maintenance Mode
                                            </Label>
                                            <p className="text-sm text-red-600/80">
                                                Restricts login for all non-admin users. Apply globally.
                                            </p>
                                            {settings.maintenance_mode && (
                                                <span className="inline-block mt-2 text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded">WARNING: PLATFORM IS OFFLINE FOR USERS</span>
                                            )}
                                        </div>
                                        <Switch
                                            checked={settings.maintenance_mode}
                                            onCheckedChange={(c) => setSettings({ ...settings, maintenance_mode: c })}
                                        />
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-red-100">
                                        <Label>Maintenance Strategy</Label>
                                        <Select value={settings.maintenance_type} onValueChange={(val: any) => setSettings({ ...settings, maintenance_type: val })}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="instant">Instant Response (Urgent)</SelectItem>
                                                <SelectItem value="scheduled">Scheduled Routine</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {settings.maintenance_type === "scheduled" && (
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div className="space-y-2">
                                                <Label>Start Time</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={settings.maintenance_start}
                                                    onChange={(e) => setSettings({ ...settings, maintenance_start: e.target.value })}
                                                    className="bg-white border-red-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Time</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={settings.maintenance_end}
                                                    onChange={(e) => setSettings({ ...settings, maintenance_end: e.target.value })}
                                                    className="bg-white border-red-200"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <HardDrive className="h-5 w-5 text-blue-500" />
                                    Resource Limits
                                </CardTitle>
                                <CardDescription>Configure file sizes and storage quotas.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="maxUpload">Max Upload Size (MB)</Label>
                                    <div className="flex items-center gap-2 max-w-sm">
                                        <Input
                                            id="maxUpload"
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={settings.max_upload_size_mb}
                                            onChange={(e) => setSettings({ ...settings, max_upload_size_mb: parseInt(e.target.value) || 10 })}
                                        />
                                        <span className="text-sm text-slate-500 font-medium">Megabytes</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Limits the size of PDF syllabus uploads for all professors.</p>
                                </div>
                            </CardContent>
                        </Card> */}

                        <AnnouncementsManager token={(session?.user as any)?.accessToken || ""} />

                    </div>
                )}
            </PageTransition>
        </div>
    )
}

function AnnouncementsManager({ token }: { token: string }) {
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newTitle, setNewTitle] = useState("")
    const [newMessage, setNewMessage] = useState("")
    const [newType, setNewType] = useState("info")

    const loadAnnouncements = async () => {
        try {
            if (!token) return;
            const data = await fetchGlobalAnnouncements(token, false)
            setAnnouncements(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAnnouncements()
    }, [token])

    const handleCreate = async () => {
        if (!newTitle.trim() || !newMessage.trim()) return toast.error("Please fill all fields")
        try {
            await createGlobalAnnouncement(token, { title: newTitle, message: newMessage, type: newType, active: true })
            toast.success("Announcement published")
            setNewTitle("")
            setNewMessage("")
            setNewType("info")
            loadAnnouncements()
        } catch (e) {
            toast.error("Failed to create announcement")
            console.error(e)
        }
    }

    const handleToggle = async (id: string, active: boolean) => {
        try {
            await toggleGlobalAnnouncement(token, id, active)
            setAnnouncements(announcements.map(a => a._id === id ? { ...a, active } : a))
            toast.success("Status updated")
        } catch (e) {
            toast.error("Failed to update status")
            console.error(e)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteGlobalAnnouncement(token, id)
            setAnnouncements(announcements.filter(a => a._id !== id))
            toast.success("Announcement deleted")
        } catch (e) {
            toast.error("Failed to delete announcement")
            console.error(e)
        }
    }

    return (
        <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="h-5 w-5 text-amber-500" />
                    Global Announcements
                </CardTitle>
                <CardDescription>Manage alerts broadcasted to all professors and students. Displays as a banner at the top of the interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2"><Plus className="h-4 w-4" /> Create New Announcement</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input placeholder="Announcement Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="col-span-2 bg-white" />
                        <Select value={newType} onValueChange={setNewType}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info (Blue)</SelectItem>
                                <SelectItem value="warning">Warning (Amber)</SelectItem>
                                <SelectItem value="critical">Critical (Red)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Textarea placeholder="Message body..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="min-h-[80px] bg-white" />
                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">Publish Announcement</Button>
                </div>

                <div className="rounded-md border border-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[100px]">Active</TableHead>
                                <TableHead className="w-[100px]">Type</TableHead>
                                <TableHead className="w-[200px]">Title</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead className="w-[150px]">Date</TableHead>
                                <TableHead className="text-right w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell>
                                </TableRow>
                            ) : announcements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">No announcements found.</TableCell>
                                </TableRow>
                            ) : announcements.map((a) => (
                                <TableRow key={a._id} className={!a.active ? "opacity-60" : ""}>
                                    <TableCell>
                                        <Switch checked={a.active} onCheckedChange={(checked) => handleToggle(a._id, checked)} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            (a.type || 'info') === 'critical' ? 'border-red-200 text-red-700 bg-red-50' :
                                                (a.type || 'info') === 'warning' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                                    'border-blue-200 text-blue-700 bg-blue-50'
                                        }>
                                            {(a.type || 'info').toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{a.title}</TableCell>
                                    <TableCell className="truncate max-w-[300px]" title={a.message}>{a.message}</TableCell>
                                    <TableCell className="text-slate-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a._id)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
