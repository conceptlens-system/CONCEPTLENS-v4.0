"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LogOut, User, Save, Edit2, Lock, ShieldCheck } from "lucide-react"
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog"
import { signOut, useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { fetchUserProfile, updateUserProfile } from "@/lib/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/PageTransition"

export default function AdminProfilePage() {
    const { data: session, status } = useSession()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [passwordOpen, setPasswordOpen] = useState(false)

    const [profile, setProfile] = useState<any>(null)
    const [formData, setFormData] = useState({
        full_name: "",
        bio: "",
        phone: "",
        linkedin_url: "",
    })

    useEffect(() => {
        if (status === "loading") return

        if (status === "unauthenticated" || !session) {
            setLoading(false)
            return
        }

        if ((session?.user as any)?.accessToken) {
            loadProfile()
        } else {
            setLoading(false)
        }
    }, [session, status])

    const loadProfile = async () => {
        try {
            const token = (session?.user as any)?.accessToken
            const data = await fetchUserProfile(token)
            setProfile(data)

            setFormData({
                full_name: data.full_name || "",
                bio: data.bio || "",
                phone: data.phone || "",
                linkedin_url: data.linkedin_url || "",
            })
        } catch (e) {
            console.error(e)
            toast.error("Failed to load profile")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!session) return
        const token = (session?.user as any)?.accessToken

        try {
            const payload = {
                full_name: formData.full_name,
                bio: formData.bio,
                phone: formData.phone,
                linkedin_url: formData.linkedin_url,
            }

            setSaving(true)
            const updated = await updateUserProfile(payload, token)
            setProfile(updated)
            setIsEditing(false)
            toast.success("Profile updated successfully")
        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Failed to update profile")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>

    return (
        <PageTransition className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Admin Profile</h1>
                    <p className="text-slate-500 mt-2">Manage your administrative identity and account settings.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Core Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium flex items-center gap-2">
                                <User className="h-5 w-5 text-indigo-600" />
                                Personal Details
                            </CardTitle>
                            {!isEditing ? (
                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving}>
                                        {saving ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save</>}
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Bio / About Me</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    placeholder="Brief description of your role..."
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input
                                        placeholder="e.g. +1 234 567 890"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>LinkedIn URL</Label>
                                    <Input
                                        placeholder="https://linkedin.com/in/username"
                                        value={formData.linkedin_url}
                                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Account Info */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-700">Account Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                    {session?.user?.name?.[0] || "A"}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{session?.user?.name}</p>
                                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Role</p>
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                                    <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                                </Badge>
                            </div>
                            <Button variant="outline" className="w-full bg-white justify-start mt-4" onClick={() => setPasswordOpen(true)}>
                                <Lock className="mr-2 h-4 w-4" /> Change Password
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-indigo-50 border-indigo-100">
                        <CardHeader>
                            <CardTitle className="text-base text-indigo-800 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> System Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full bg-white justify-start" onClick={() => window.location.href = '/admin/settings'}>
                                Global Settings
                            </Button>
                            <Button variant="outline" className="w-full bg-white justify-start" onClick={() => window.location.href = '/admin/users'}>
                                User Management
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ChangePasswordDialog
                isOpen={passwordOpen}
                onClose={() => setPasswordOpen(false)}
                token={(session?.user as any)?.accessToken}
            />
        </PageTransition>
    )
}
